import { Mail, MapPin, Phone } from 'lucide-react';

export const ContactPage = () => (
  <div className="mx-auto max-w-2xl px-6 pb-24 pt-0">
    <h2 className="mb-8 text-4xl font-black">Contact Us</h2>

    <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Phone size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-ink-muted">Call Us</p>
            <p className="font-bold">+91 7893504892</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Mail size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-ink-muted">Email Us</p>
            <p className="font-bold">thekindbridge@gmail.com</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500">
            <MapPin size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-ink-muted">Location</p>
            <p className="font-bold">COFFEE-HUB</p>
            <p className="text-sm text-ink-muted">R5CQ+CM Inkollu, Andhra Pradesh, India</p>
          </div>
        </div>
      </div>
      <div className="rounded-[40px] border border-white/10 bg-white/5 p-6">
        <h4 className="mb-4 font-bold">Follow Us</h4>
        <div className="flex gap-4">
          {['Instagram', 'WhatsApp', 'Telegram'].map(social => (
            <div key={social} className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-white/10 transition-colors hover:bg-primary">
              <span className="text-[10px] font-bold">{social[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <div className="overflow-hidden rounded-[40px] border border-white/10 grayscale contrast-125">
        <div className="relative aspect-[16/12] w-full sm:aspect-[16/9]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d506.35838004601595!2d80.18905782789219!3d15.82115881859916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4a5989b6574b4b%3A0x586644323376bd00!2sCOFFEE%20HUB!5e1!3m2!1sen!2sin!4v1773126673652!5m2!1sen!2sin"
            title="COFFEE-HUB Inkollu Map"
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
      <a
        href="https://maps.app.goo.gl/8B32K8X6Vdhg6VUE6"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#fff8f2] transition-colors hover:bg-primary"
      >
        Open in Google Maps
      </a>
    </div>
  </div>
);
