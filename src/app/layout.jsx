import './globals.css';

export const metadata = {
  title: 'MemberGPT | Kalos Coach Intelligence',
  description: 'Ask natural-language questions about member scan data, powered by Gemini AI.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skipNav">
          Skip to main content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
