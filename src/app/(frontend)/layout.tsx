import React from 'react'
import './globals.css'

export const metadata = {
  description: 'uballoon - バルーンギフトEC',
  title: 'uballoon',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ja">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
