export const metadata = {
  title: 'Dink Weather - Pickleball Conditions',
  description: 'Check weather conditions for pickleball in your area',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
