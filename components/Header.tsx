"use client"

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export function Header() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return null
  }

  if (!user) {
    return null
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/kiplo-logo-wb.svg" 
              alt="Kiplo" 
              width={40} 
              height={40}
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold">Kiplo</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}

