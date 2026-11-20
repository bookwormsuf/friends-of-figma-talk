/** The Supabase project that relays phone remote messages. The values come from two environment variables,
 * read when the site is built: VITE_SUPABASE_URL and VITE_SUPABASE_KEY. See .env.example.
 * Use the project's "publishable" key, which is safe to ship to browsers, and a project that holds no data.
 * While either value is blank, the "Phone ↗" button is hidden and the site never contacts Supabase. */
const env=import.meta.env as Record<string,string|undefined>|undefined;
export const remoteConfig={
 url:env?.VITE_SUPABASE_URL??'',
 key:env?.VITE_SUPABASE_KEY??'',
};
