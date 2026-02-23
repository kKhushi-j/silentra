# **App Name**: Silentra

## Core Features:

- Real-Time Noise Monitoring: Simulates real-time decibel input and provides an animated digital display with noise classification (Silent, Moderate, Warning, Critical, Emergency).
- Adaptive Threshold Management: Admin panel with login and environment selector (ICU, Patient Ward, Library, etc.) to adjust Silent, Warning, and Critical thresholds, storing configurations to Firestore.
- Environmental Noise Reference: Displays standard noise levels for various environments (Healthcare, Educational, Religious, Administrative, Public Indoor) with compliance warnings.
- Intelligent Alert System: Triggers background color transitions (Green, Yellow, Orange, Red) and optional audio/voice alerts when thresholds are crossed, with escalation logic.
- Noise Heatmap Visualization: Allows users to upload room images and overlay simulated heatmaps, highlighting active noisy zones with animated red glows.
- Data Logging & Analytics: Stores noise logs in Firestore (timestamp, environment type, decibel value, classification) and displays real-time logs, line charts, and daily peak indicators.
- Predictive Trend Simulation: Based on the last 20 noise values, the 'SilentraAI' application offers predictions about the probability of high noise levels within the next five minutes, alerting users via the LLM tool.

## Style Guidelines:

- Primary color: Neon blue (#428ef4) for a futuristic cyber look.
- Background color: Dark grey (#202020) for a contrasting base.
- Accent color: Neon purple (#a55eea) for highlights and interactive elements.
- Body and headline font: 'Space Grotesk' sans-serif for a computerized, techy look.
- Use neon-style icons to match the futuristic aesthetic.
- Grid-based layout with glassmorphism cards, rounded corners, and sidebar navigation.
- Smooth CSS animations and transitions for background colors, loading animations, and hover effects.
- Animated circular decibel gauge
- Waveform animation behind header
- Smooth fade transitions between states
- Micro-interactions on hover
- Dark cyber theme + subtle grid background pattern
- make it look like real SaaS software.