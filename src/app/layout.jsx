import './globals.css';

export const metadata = {
  title: 'MemberGPT | Kalos Coach Intelligence',
  description: 'Ask natural-language questions about member scan data, powered by Gemini AI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
