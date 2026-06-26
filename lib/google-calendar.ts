const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface RefreshedAccessToken {
  accessToken: string;
  expiresIn: number;
}

// Google access tokens are short-lived (~1hr) and Supabase does not refresh
// Google's own provider token — al-quotes refreshes it directly against
// Google's token endpoint, on demand, right before each sync publish.
const refreshGoogleAccessToken = async (refreshToken: string): Promise<RefreshedAccessToken | null> => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Cannot refresh Google access token: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not configured');
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Google rejected the refresh token request:', await response.text());
      return null;
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  } catch (error) {
    console.error('Failed to refresh Google access token:', error);
    return null;
  }
};

export { refreshGoogleAccessToken };
