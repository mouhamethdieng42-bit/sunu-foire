import { NextResponse, type NextRequest } from 'next/server'
import cookie from 'cookie'

export async function proxy(req: NextRequest) {
  const url = req.nextUrl
  
  // Vérifier si on essaie d'accéder à /admin
  if (url.pathname.startsWith('/admin')) {
    // Lire tous les cookies
    const cookies = cookie.parse(req.headers.get('cookie') || '')
    
    // Vérifier si le cookie de session Supabase existe
    const sessionCookie = cookies['sb-access-token'] || cookies['sb-refresh-token']
    
    if (!sessionCookie) {
      // Pas de session, rediriger vers login
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin', req.url))
    }
    
    // Vérifier en base de données si l'utilisateur est admin
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      // Appel à l'API Supabase pour vérifier le rôle
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role`, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${sessionCookie}`,
        },
      })
      
      const data = await response.json()
      const role = data[0]?.role
      
      if (role !== 'admin') {
        // Pas admin, rediriger vers accueil
        return NextResponse.redirect(new URL('/', req.url))
      }
    } catch (error) {
      console.error('Erreur vérification admin:', error)
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}