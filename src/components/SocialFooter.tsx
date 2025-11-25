import Link from "next/link";
import {
  Facebook,
  X,
  Instagram,
  Linkedin,
  Github,
  MessageCircle,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";

export default function SocialFooter() {
  return (
    <footer className="w-full bg-gradient-to-br from-[#004B2E] to-[#006837] text-[#FCF8E3] py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and copyright */}
          <div className="flex flex-col items-center md:items-start">
            <Link
              href="/"
              className="text-2xl font-bold text-[#D4AF37] rounded-md px-2 py-1 hover:bg-[#FCF8E3]/20 hover:text-[#D4AF37] transition-colors duration-200 mb-4"
            >
              University HRIS
            </Link>
            <p className="text-sm text-[#FCF8E3] text-center md:text-left">
              &copy; {new Date().getFullYear()} Kaimosi Friends University. All rights reserved.
            </p>
          </div>

          {/* Quick navigation links */}
          <div className="flex flex-col items-center md:items-center">
            <h3 className="text-lg font-semibold text-[#D4AF37] mb-4">Quick Links</h3>
            <div className="flex flex-col items-center space-y-2">
              <Link
                href="/about"
                className="text-[#FCF8E3] hover:text-[#D4AF37] transition-colors duration-200 border-b border-transparent hover:border-[#D4AF37] pb-1"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-[#FCF8E3] hover:text-[#D4AF37] transition-colors duration-200 border-b border-transparent hover:border-[#D4AF37] pb-1"
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className="text-[#FCF8E3] hover:text-[#D4AF37] transition-colors duration-200 border-b border-transparent hover:border-[#D4AF37] pb-1"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Social media links - now displayed as classy icons only */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="text-lg font-semibold text-[#D4AF37] mb-4">Connect With Us</h3>
            <div className="flex flex-wrap justify-center md:justify-end gap-4">
              {[
                {
                  href: "https://web.facebook.com/profile.php?id=61576682944507",
                  icon: <Facebook size={28} className="hover:scale-110 transition-transform" />,
                  label: "Follow us on Facebook",
                },
                {
                  href: "https://x.com/DevIsaacMaina",
                  icon: <X size={28} className="hover:scale-110 transition-transform" />,
                  label: "Follow us on Twitter",
                },
                {
                  href: "https://www.instagram.com/devisaacmaina",
                  icon: <Instagram size={28} className="hover:scale-110 transition-transform" />,
                  label: "Follow us on Instagram",
                },
                {
                  href: "https://www.linkedin.com/in/isaac-maina/?skipRedirect=true",
                  icon: <Linkedin size={28} className="hover:scale-110 transition-transform" />,
                  label: "Connect on LinkedIn",
                },
                {
                  href: "https://github.com/IsaacMaina",
                  icon: <Github size={28} className="hover:scale-110 transition-transform" />,
                  label: "Check our GitHub",
                },
                {
                  href: "https://wa.me/254758302725",
                  icon: <MessageCircle size={28} className="hover:scale-110 transition-transform" />,
                  label: "Chat on WhatsApp",
                },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FCF8E3] hover:text-[#D4AF37] transition-all duration-300 hover:scale-125 rounded-full p-2 hover:bg-[#D4AF37]/20"
                  aria-label={label}
                >
                  {icon}
                </a>
              ))}
            </div>

            {/* Contact info as icons only */}
            <div className="flex flex-wrap justify-center md:justify-end gap-4 mt-4">
              {[
                {
                  href: "mailto:mainaisaacwachira2000@gmail.com",
                  icon: <Mail size={24} className="hover:scale-110 transition-transform" />,
                  label: "Email us",
                },
                {
                  href: "tel:+254758302725",
                  icon: <Phone size={24} className="hover:scale-110 transition-transform" />,
                  label: "Call us",
                },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  className="text-[#FCF8E3] hover:text-[#D4AF37] transition-all duration-300 hover:scale-125 rounded-full p-2 hover:bg-[#D4AF37]/20"
                  aria-label={label}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div className="border-t border-[#D4AF37]/30 my-8"></div>

        {/* Bottom section with additional info */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-[#FCF8E3]/70 mb-4 md:mb-0">
            Designed with ❤️ for Kaimosi Friends University
          </p>
          <div className="flex space-x-6">
            <Link href="/terms" className="text-xs text-[#FCF8E3]/70 hover:text-[#D4AF37] transition-colors">
              Terms
            </Link>
            <Link href="/help" className="text-xs text-[#FCF8E3]/70 hover:text-[#D4AF37] transition-colors">
              Help Center
            </Link>
            <Link href="/support" className="text-xs text-[#FCF8E3]/70 hover:text-[#D4AF37] transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}