import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserId } from '../../auth/AuthProvider'
import { supabase, unwrap } from '../../lib/supabase'
import { MODULES, type ModuleKey } from './modules'

export type Me = { id: string; display_name: string; is_admin: boolean }
export type AdminUser = Me & { email: string; created_at: string }

const qk = {
  me: ['me'] as const,
  modules: (userId: string) => ['modules', userId] as const,
  allModules: ['modules'] as const,
  adminUsers: ['adminUsers'] as const,
}

export function useMe() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => unwrap(await supabase.from('profiles').select('id, display_name, is_admin').eq('id', uid).single()) as Me,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: async (display_name: string) => unwrap(await supabase.from('profiles').update({ display_name }).eq('id', uid)),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** Sezioni abilitate per un utente: in assenza di riga la sezione è abilitata. */
export function useModuleAccess(userId?: string) {
  const uid = useUserId()
  const target = userId ?? uid
  return useQuery({
    queryKey: qk.modules(target),
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('user_module_access').select('module, enabled').eq('user_id', target),
      ) as { module: ModuleKey; enabled: boolean }[]
      const disabled = new Set(rows.filter((r) => !r.enabled).map((r) => r.module))
      return Object.fromEntries(MODULES.map((m) => [m.key, !disabled.has(m.key)])) as Record<ModuleKey, boolean>
    },
  })
}

export function useEnabledModules() {
  const { data, isLoading } = useModuleAccess()
  return { modules: MODULES.filter((m) => data?.[m.key] ?? true), isLoading }
}

export function useSetModuleAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { userId: string; module: ModuleKey; enabled: boolean }) =>
      unwrap(
        await supabase
          .from('user_module_access')
          .upsert({ user_id: v.userId, module: v.module, enabled: v.enabled }, { onConflict: 'user_id,module' }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.allModules }),
  })
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: qk.adminUsers,
    enabled,
    queryFn: async () => unwrap(await supabase.rpc('admin_list_users')) as AdminUser[],
  })
}

export function useSetAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { userId: string; admin: boolean }) =>
      unwrap(await supabase.rpc('set_user_admin', { p_user: v.userId, p_admin: v.admin })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsers })
      qc.invalidateQueries({ queryKey: qk.me })
    },
  })
}
