-- ECOS: registro e idempotencia de pagos
--
--   apply_payment   registra un pago (idempotente) y confirma la inscripción si corresponde
--   webhook_events  bitácora de notificaciones recibidas (auditoría y reproceso)
--
-- Resultados de apply_payment (texto):
--   confirmed          el pago confirmó la inscripción
--   already_confirmed  aviso repetido de un pago ya aplicado
--   pending            el pago aún no está acreditado
--   rejected           el pago fue rechazado
--   refunded           el pago fue devuelto (no se cancela nada automáticamente)
--   amount_mismatch    pagó un monto distinto al de la inscripción -> revisión manual
--   duplicate_payment  segundo pago aprobado para una inscripción ya confirmada -> revisión manual
--   needs_review       pago aprobado pero los turnos ya no están retenidos -> revisión manual
-- Los casos de revisión manual dejan el pago en estado 'needs_review' y NO se pierden.

alter table payments add constraint payments_estado_check
  check (estado in ('pending', 'pending_review', 'approved', 'rejected', 'refunded', 'needs_review'));

create function apply_payment(
  p_enrollment_id       uuid,
  p_proveedor           text,
  p_provider_payment_id text,
  p_monto               numeric,
  p_estado              text,
  p_raw                 jsonb default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_enr      enrollments;
  v_inserted boolean;
begin
  if p_estado not in ('pending', 'approved', 'rejected', 'refunded') then
    raise exception 'invalid_payment_status' using detail = p_estado;
  end if;

  -- Serializa avisos simultáneos del mismo pago sobre la misma inscripción.
  select * into v_enr from enrollments where id = p_enrollment_id for update;
  if not found then
    raise exception 'enrollment_not_found';
  end if;

  insert into payments (enrollment_id, proveedor, provider_payment_id, monto, estado, raw)
  values (p_enrollment_id, p_proveedor, p_provider_payment_id, p_monto, p_estado, p_raw)
  on conflict (proveedor, provider_payment_id) do update
    set estado = case
          -- Un aviso tardío o desordenado no deshace un pago ya aprobado.
          when payments.estado in ('approved', 'needs_review')
               and excluded.estado in ('pending', 'rejected') then payments.estado
          else excluded.estado
        end,
        raw = excluded.raw
  returning (xmax = 0) into v_inserted;

  if p_estado in ('pending', 'rejected', 'refunded') then
    return p_estado;
  end if;

  -- A partir de acá el pago está aprobado.
  if v_enr.estado in ('active', 'completed') then
    if v_inserted then
      update payments set estado = 'needs_review'
      where proveedor = p_proveedor and provider_payment_id = p_provider_payment_id;
      return 'duplicate_payment';
    end if;
    return 'already_confirmed';
  end if;

  if p_monto <> v_enr.monto then
    update payments set estado = 'needs_review'
    where proveedor = p_proveedor and provider_payment_id = p_provider_payment_id;
    return 'amount_mismatch';
  end if;

  begin
    perform confirm_enrollment(p_enrollment_id);
    return 'confirmed';
  exception when others then
    if sqlerrm in ('holds_lost', 'enrollment_not_confirmable') then
      update payments set estado = 'needs_review'
      where proveedor = p_proveedor and provider_payment_id = p_provider_payment_id;
      return 'needs_review';
    end if;
    raise;
  end;
end;
$$;

revoke execute on function apply_payment(uuid, text, text, numeric, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Bitácora de webhooks
-- ---------------------------------------------------------------------------
create table webhook_events (
  id          bigint generated always as identity primary key,
  proveedor   text not null,
  event_key   text,          -- id del pago u objeto notificado
  received_at timestamptz not null default now(),
  payload     jsonb,
  outcome     text,          -- resultado de apply_payment, 'ignored' o 'error'
  error       text
);

create index webhook_events_received_idx on webhook_events (received_at desc);

alter table webhook_events enable row level security;
grant select on webhook_events to authenticated;
create policy webhook_events_owner_read on webhook_events
  for select to authenticated using (is_owner());
