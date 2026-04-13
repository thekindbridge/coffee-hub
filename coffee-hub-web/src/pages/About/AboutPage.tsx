export const AboutPage = () => (
  <div className="mx-auto max-w-2xl px-6 pb-24 pt-24">
    <h2 className="mb-8 text-4xl font-black">Our Story</h2>
    <div className="mb-8 aspect-video overflow-hidden rounded-[40px]">
      <img
        src="https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=80"
        alt="Kitchen"
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="space-y-6 leading-relaxed text-ink-muted">
      <p>
        <span className="font-bold text-white">COFFEE-HUB</span> serves hot Indo-Chinese street food made with fresh ingredients and authentic wok cooking style.
      </p>
      <p>
        Born in the heart of Inkollu, we bring the fiery flavors of the wok to your doorstep. Our chefs specialize in the perfect balance of spices, textures, and that signature wok hei.
      </p>
      <p>
        We focus on hygiene, taste, and lightning-fast service. Whether it&apos;s our signature Chicken Manchurian or the classic Veg Noodles, every dish is a celebration of street-style Chinese fast food.
      </p>
    </div>
  </div>
);
