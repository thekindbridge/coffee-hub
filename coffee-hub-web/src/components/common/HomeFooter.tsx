import type { CustomerTab } from '../../constants/routes';

type HomeFooterProps = {
  onNavigate: (tab: CustomerTab) => void;
};

export const HomeFooter = ({ onNavigate }: HomeFooterProps) => (
  <footer className="mt-12 border-t border-white/5 px-6 pb-32 pt-12">
    <div className="mb-12 grid grid-cols-2 gap-8">
      <div>
        <h4 className="mb-4 font-black">Quick Links</h4>
        <ul className="space-y-2 text-sm text-ink-muted">
          <li onClick={() => onNavigate('about')} className="cursor-pointer hover:text-primary">About Us</li>
          <li onClick={() => onNavigate('contact')} className="cursor-pointer hover:text-primary">Contact</li>
          <li onClick={() => onNavigate('menu')} className="cursor-pointer hover:text-primary">Menu</li>
        </ul>
      </div>
      <div>
        <h4 className="mb-4 font-black">Legal</h4>
        <ul className="space-y-2 text-sm text-ink-muted">
          <li className="hover:text-primary">Privacy Policy</li>
          <li className="hover:text-primary">Terms of Service</li>
        </ul>
      </div>
    </div>
    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-ink-muted">
      &copy; 2024 COFFEE HUB. All rights reserved.
    </p>
  </footer>
);
