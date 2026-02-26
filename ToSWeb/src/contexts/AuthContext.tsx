import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  getAdditionalUserInfo,
  type User,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

// Firestore schema for users/{uid}
export type UserProfile = {
  uid: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  phone: string | null
  plan: 'free' | string
  stripe_customer_id: string | null
  created_at: unknown   // Firestore Timestamp (serverTimestamp)
  last_login: unknown   // Firestore Timestamp (serverTimestamp)
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  getIdToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Write or merge a user document in Firestore
async function writeUserDoc(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    // Non-blocking: don't fail sign-in if Firestore is slow
    writeUserDoc(cred.user.uid, { last_login: serverTimestamp() })
      .catch(e => console.warn('last_login update failed:', e))
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    displayName: string,
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // Set displayName on the Firebase Auth user object
    await updateProfile(cred.user, { displayName })
    // Write full profile to Firestore — blocking so profile exists before navigation
    await writeUserDoc(cred.user.uid, {
      uid: cred.user.uid,
      email,
      firstName,
      lastName,
      displayName,
      phone: null,
      plan: 'free',
      stripe_customer_id: null,
      created_at: serverTimestamp(),
      last_login: serverTimestamp(),
    })
  }

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    const u = cred.user
    const isNew = getAdditionalUserInfo(cred)?.isNewUser ?? false

    if (isNew) {
      // First time: create full profile. Split displayName into first/last best-effort.
      const parts = (u.displayName ?? '').trim().split(/\s+/)
      const firstName = parts[0] ?? ''
      const lastName = parts.slice(1).join(' ')
      await writeUserDoc(u.uid, {
        uid: u.uid,
        email: u.email ?? '',
        firstName,
        lastName,
        displayName: u.displayName ?? '',
        phone: null,
        plan: 'free',
        stripe_customer_id: null,
        created_at: serverTimestamp(),
        last_login: serverTimestamp(),
      })
    } else {
      // Returning user: just update last_login
      writeUserDoc(u.uid, { last_login: serverTimestamp() })
        .catch(e => console.warn('last_login update failed:', e))
    }
  }

  const signOut = () => firebaseSignOut(auth)

  const getIdToken = async () => {
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
