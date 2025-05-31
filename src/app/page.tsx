'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

export default function Home() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { data: session } = authClient.useSession()

  const onSubmit = async () => {
    const response = await authClient.signUp.email(
      {
        name,
        email,
        password
      },
      {
        onError(context) {
          window.alert(context.error.message)
        },
        onSuccess() {
          window.alert('Sign up success')
        }
      }
    )
  }

  const onLogin = async () => {
    const response = await authClient.signIn.email(
      {
        email,
        password
      },
      {
        onError(context) {
          window.alert(context.error.message)
        },
        onSuccess() {
          window.alert('Login success')
        }
      }
    )
  }

  if (session) {
    return (
      <div className='flex flex-col gap-y-4 p-4'>
        <p>Logged in as {session.user.name}</p>
        <Button onClick={() => authClient.signOut()}>Sign Out</Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-y-10'>
      <div className='flex flex-col gap-y-4 p-4'>
        <Input
          type='text'
          placeholder='name'
          autoComplete='off'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type='email'
          placeholder='email'
          value={email}
          autoComplete='off'
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type='password'
          placeholder='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button onClick={onSubmit}>Create User</Button>
      </div>
      <div className='flex flex-col gap-y-4 p-4'>
        <Input
          type='text'
          placeholder='name'
          autoComplete='off'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type='email'
          placeholder='email'
          value={email}
          autoComplete='off'
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type='password'
          placeholder='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button onClick={onLogin}>Login</Button>
      </div>
    </div>
  )
}
