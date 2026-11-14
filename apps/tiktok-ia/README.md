# TikTok IA

Appli 100 % navigateur (HTML + JavaScript + IndexedDB), sans installation, construite d'après la vidéo TikTok de @laurentvoanh.

Principe :
1. URL d'une vidéo TikTok → API **oEmbed** officielle de TikTok → première image (miniature).
2. L'image est envoyée à **Mistral** (modèle vision) avec une question (ex. « dans quel film peut-elle jouer ? »).
3. Les résultats sont gardés dans la base IndexedDB du navigateur.

Usage : ouvrir `index.html` dans Chrome, coller sa clé API Mistral (gratuite sur console.mistral.ai), coller une URL TikTok.

Limites : si TikTok refuse l'appel oEmbed direct (CORS), l'appli retente via le proxy CORS indiqué dans les réglages. La clé reste dans le `localStorage` du navigateur.
