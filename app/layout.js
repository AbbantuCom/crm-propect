import "./globals.css";

export const metadata = {
  title: "WebDev CRM",
  description: "Internal prospect CRM for WebDev",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
