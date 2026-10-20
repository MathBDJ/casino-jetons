import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = chargement
  const [profileState, setProfileState] = useState({ id: null, data: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setProfileState({ id: userId, data }))
  }, [userId])

  const loading = session === undefined || (!!userId && profileState.id !== userId)
  const profile = profileState.id === userId ? profileState.data : null

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}