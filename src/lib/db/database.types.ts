
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "antes": Json | null,"at": string,"despues": Json | null,"fila_id": string | null,"id": number,"operacion": string,"tabla": string,"usuario": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "antes"?: Json | null,"at"?: string,"despues"?: Json | null,"fila_id"?: string | null,"id"?: never,"operacion": string,"tabla": string,"usuario"?: string | null
                  }
                  Update: {
                    "antes"?: Json | null,"at"?: string,"despues"?: Json | null,"fila_id"?: string | null,"id"?: never,"operacion"?: string,"tabla"?: string,"usuario"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"availability_rules": {
                  Row: {
                    "end_time": string,"id": string,"instructor_id": string,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "end_time": string,"id"?: string,"instructor_id": string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "end_time"?: string,"id"?: string,"instructor_id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_rules_instructor_id_fkey"
      columns: ["instructor_id"]
isOneToOne: false
      referencedRelation: "instructors"
      referencedColumns: ["id"]
    }
                  ]
                },"blackouts": {
                  Row: {
                    "ends_at": string,"id": string,"instructor_id": string | null,"motivo": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_at": string,"id"?: string,"instructor_id"?: string | null,"motivo"?: string | null,"starts_at": string
                  }
                  Update: {
                    "ends_at"?: string,"id"?: string,"instructor_id"?: string | null,"motivo"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blackouts_instructor_id_fkey"
      columns: ["instructor_id"]
isOneToOne: false
      referencedRelation: "instructors"
      referencedColumns: ["id"]
    }
                  ]
                },"courses": {
                  Row: {
                    "activo": boolean,"cantidad_clases": number,"id": string,"incluye_examen": boolean,"nombre": string,"precio_lista": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"cantidad_clases": number,"id"?: string,"incluye_examen"?: boolean,"nombre": string,"precio_lista": number
                  }
                  Update: {
                    "activo"?: boolean,"cantidad_clases"?: number,"id"?: string,"incluye_examen"?: boolean,"nombre"?: string,"precio_lista"?: number
                  }
                  Relationships: [
                    
                  ]
                },"enrollments": {
                  Row: {
                    "course_id": string,"created_at": string,"estado": Database["public"]['Enums']["enrollment_status"],"id": string,"metodo": Database["public"]['Enums']["payment_method"],"monto": number,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"estado": Database["public"]['Enums']["enrollment_status"],"id"?: string,"metodo": Database["public"]['Enums']["payment_method"],"monto": number,"student_id": string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"estado"?: Database["public"]['Enums']["enrollment_status"],"id"?: string,"metodo"?: Database["public"]['Enums']["payment_method"],"monto"?: number,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"instructors": {
                  Row: {
                    "activo": boolean,"id": string,"nombre": string,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"id"?: string,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"id"?: string,"nombre"?: string,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"lessons": {
                  Row: {
                    "done_at": string | null,"done_by": string | null,"ends_at": string,"enrollment_id": string,"fecha_local": string | null,"hold_expires_at": string | null,"id": string,"instructor_id": string,"kind": Database["public"]['Enums']["lesson_kind"],"nro_clase": number | null,"starts_at": string,"status": Database["public"]['Enums']["lesson_status"],"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "done_at"?: string | null,"done_by"?: string | null,"ends_at": string,"enrollment_id": string,"fecha_local"?: never,"hold_expires_at"?: string | null,"id"?: string,"instructor_id": string,"kind"?: Database["public"]['Enums']["lesson_kind"],"nro_clase"?: number | null,"starts_at": string,"status": Database["public"]['Enums']["lesson_status"],"student_id": string
                  }
                  Update: {
                    "done_at"?: string | null,"done_by"?: string | null,"ends_at"?: string,"enrollment_id"?: string,"fecha_local"?: never,"hold_expires_at"?: string | null,"id"?: string,"instructor_id"?: string,"kind"?: Database["public"]['Enums']["lesson_kind"],"nro_clase"?: number | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["lesson_status"],"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_enrollment_id_fkey"
      columns: ["enrollment_id"]
isOneToOne: false
      referencedRelation: "enrollments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_instructor_id_fkey"
      columns: ["instructor_id"]
isOneToOne: false
      referencedRelation: "instructors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_method_rules": {
                  Row: {
                    "descuento_pct": number,"metodo": Database["public"]['Enums']["payment_method"]
                  }
                  ComputedFields: never
                  Insert: {
                    "descuento_pct": number,"metodo": Database["public"]['Enums']["payment_method"]
                  }
                  Update: {
                    "descuento_pct"?: number,"metodo"?: Database["public"]['Enums']["payment_method"]
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "comprobante_path": string | null,"created_at": string,"enrollment_id": string,"estado": string,"id": string,"monto": number,"proveedor": string,"provider_payment_id": string | null,"raw": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comprobante_path"?: string | null,"created_at"?: string,"enrollment_id": string,"estado": string,"id"?: string,"monto": number,"proveedor": string,"provider_payment_id"?: string | null,"raw"?: Json | null
                  }
                  Update: {
                    "comprobante_path"?: string | null,"created_at"?: string,"enrollment_id"?: string,"estado"?: string,"id"?: string,"monto"?: number,"proveedor"?: string,"provider_payment_id"?: string | null,"raw"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_enrollment_id_fkey"
      columns: ["enrollment_id"]
isOneToOne: false
      referencedRelation: "enrollments"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "nombre": string | null,"role": Database["public"]['Enums']["user_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "nombre"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"user_id": string
                  }
                  Update: {
                    "nombre"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "key": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"students": {
                  Row: {
                    "created_at": string,"dni": string,"email": string,"fecha_nacimiento": string,"id": string,"nombre_completo": string,"telefono": string,"tutor": Json | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dni": string,"email": string,"fecha_nacimiento": string,"id"?: string,"nombre_completo": string,"telefono": string,"tutor"?: Json | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"dni"?: string,"email"?: string,"fecha_nacimiento"?: string,"id"?: string,"nombre_completo"?: string,"telefono"?: string,"tutor"?: Json | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"webhook_events": {
                  Row: {
                    "error": string | null,"event_key": string | null,"id": number,"outcome": string | null,"payload": Json | null,"proveedor": string,"received_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"event_key"?: string | null,"id"?: never,"outcome"?: string | null,"payload"?: Json | null,"proveedor": string,"received_at"?: string
                  }
                  Update: {
                    "error"?: string | null,"event_key"?: string | null,"id"?: never,"outcome"?: string | null,"payload"?: Json | null,"proveedor"?: string,"received_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"apply_payment":
{ Args: { "p_enrollment_id": string,"p_estado": string,"p_monto": number,"p_proveedor": string,"p_provider_payment_id": string,"p_raw"?: Json }; Returns: string
                           },
"cancel_enrollment":
{ Args: { "p_enrollment_id": string }; Returns: undefined
                           },
"confirm_enrollment":
{ Args: { "p_enrollment_id": string }; Returns: undefined
                           },
"create_enrollment":
{ Args: { "p_course_id": string,"p_metodo": Database["public"]['Enums']["payment_method"],"p_starts": (string)[],"p_student_id": string }; Returns: string
                           },
"get_free_slots":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "ends_at": string,"instructor_id": string,"starts_at": string
            }[]
                           },
"get_setting_int":
{ Args: { "p_key": string }; Returns: number
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_lesson_done":
{ Args: { "p_lesson_id": string,"p_user": string }; Returns: undefined
                           },
"my_student_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"release_expired_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"slot_candidates":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "ends_at": string,"instructor_id": string,"starts_at": string
            }[]
                           },
"suggest_slots":
{ Args: { "p_exclude"?: (string)[],"p_limit"?: number,"p_student_id": string,"p_wanted": string }; Returns: {
              "distance_minutes": number,"ends_at": string,"instructor_id": string,"starts_at": string
            }[]
                           }
          }
          Enums: {
            "enrollment_status": "pending_payment"|"pending_review"|"active"|"completed"|"cancelled","lesson_kind": "clase"|"examen","lesson_status": "held"|"scheduled"|"done"|"cancelled"|"no_show","payment_method": "tarjeta"|"transferencia"|"efectivo","user_role": "admin"|"owner"|"student"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "enrollment_status": ["pending_payment", "pending_review", "active", "completed", "cancelled"],"lesson_kind": ["clase", "examen"],"lesson_status": ["held", "scheduled", "done", "cancelled", "no_show"],"payment_method": ["tarjeta", "transferencia", "efectivo"],"user_role": ["admin", "owner", "student"]
          }
        }
} as const
