export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="text-center mt-5 py-3 border-top text-muted small">
      <p className="mb-0">
        &copy; {currentYear} Zen Pte Ltd. All rights reserved.
      </p>
    </footer>
  )
}
