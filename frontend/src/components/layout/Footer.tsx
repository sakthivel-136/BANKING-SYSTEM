export function Footer() {
  return (
    <footer className="footer footer-center p-4 bg-white border-t border-gray-100 text-gray-500 text-sm mt-auto w-full flex justify-between items-center px-8">
      <div>
        <p>Copyright © {new Date().getFullYear()} - All rights reserved by SmartBank Ltd</p>
      </div>
      <div className="flex gap-4">
        <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
        <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
      </div>
    </footer>
  )
}
