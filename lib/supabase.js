// lib/supabase.js
// Ce fichier sert à connecter votre application à la base de données Supabase

// J'importe la fonction createClient depuis la bibliothèque Supabase
// createClient est l'outil qui crée la connexion entre votre code et Supabase
import { createClient } from '@supabase/supabase-js'

// Je récupère l'URL de Supabase depuis le fichier .env.local
// process.env est un objet qui contient toutes vos variables d'environnement
// NEXT_PUBLIC_SUPABASE_URL est le nom que vous avez donné dans .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// Je récupère la clé publique (anon key) depuis le fichier .env.local
// Cette clé permet à votre application de lire et écrire dans la base de données
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Je crée le client Supabase avec l'URL et la clé
// Ce client sera utilisé dans toute l'application pour parler à la base de données
export const supabase = createClient(supabaseUrl, supabaseAnonKey)