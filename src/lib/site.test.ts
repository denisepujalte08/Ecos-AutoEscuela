import { describe, expect, it } from 'vitest';
import { MENSAJES, SITE, whatsappUrl } from './site';

describe('whatsappUrl', () => {
  it('apunta al número de ECOS y codifica el mensaje', () => {
    const url = new URL(whatsappUrl('Hola! ¿Cómo están?'));
    expect(url.origin + url.pathname).toBe('https://wa.me/5493624855645');
    expect(url.searchParams.get('text')).toBe('Hola! ¿Cómo están?');
  });

  it('el número tiene solo dígitos (formato que exige wa.me)', () => {
    expect(SITE.whatsappNumero).toMatch(/^\d{10,15}$/);
  });

  it('el mensaje de un curso menciona el curso', () => {
    expect(MENSAJES.curso('Curso de 5 clases')).toContain('Curso de 5 clases');
  });
});
