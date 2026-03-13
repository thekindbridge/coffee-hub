type MenuCategory =
  | 'Tea'
  | 'Milk'
  | 'Coffee'
  | 'Coolers'
  | 'Mocktails'
  | 'Milk Shakes'
  | 'Lassi'
  | 'Icecreams'
  | 'SP Shakes'
  | 'Premium Shakes'
  | 'Snacks';

interface SeedMenuItem {
  name: string;
  category: MenuCategory;
  price: number;
  spiceLevel: number;
  veg: boolean;
  rating: number;
  image: string;
  description: string;
  isAvailable: boolean;
}

const CATEGORY_IMAGES: Record<MenuCategory, string> = {
  Tea: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=1200&q=80',
  Milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=80',
  Coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
  Coolers: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=1200&q=80',
  Mocktails: 'https://images.unsplash.com/photo-1551024709-8f23befc6a81?auto=format&fit=crop&w=1200&q=80',
  'Milk Shakes': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',
  Lassi: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=1200&q=80',
  Icecreams: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=1200&q=80',
  'SP Shakes': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=80',
  'Premium Shakes': 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=1200&q=80',
  Snacks: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
};

const item = (
  name: string,
  category: MenuCategory,
  price: number,
  description: string,
  spiceLevel = 0,
  veg = true,
  rating = 4.2,
  image = CATEGORY_IMAGES[category],
): SeedMenuItem => ({
  name,
  category,
  price,
  spiceLevel,
  veg,
  rating,
  image,
  description,
  isAvailable: true,
});

export const menuItems: SeedMenuItem[] = [
  item('Dum Tea', 'Tea', 10, 'Hot dum tea brewed fresh.'),
  item('Black Tea', 'Tea', 20, 'Classic black tea with rich aroma.'),
  item('Lemon Tea', 'Tea', 20, 'Refreshing lemon-infused tea.'),
  item('Green Tea', 'Tea', 20, 'Light and healthy green tea.'),
  item('Badam Tea', 'Tea', 20, 'Tea with almond flavor notes.'),
  item('Bellam Tea', 'Tea', 20, 'Jaggery sweetened traditional tea.'),
  item('Ginger Tea', 'Tea', 20, 'Spiced tea with fresh ginger.', 1),
  item('Pepper Tea', 'Tea', 20, 'Warm tea with black pepper kick.', 2),
  item('Elachi Tea', 'Tea', 25, 'Cardamom tea with smooth finish.'),
  item('Masala Tea', 'Tea', 25, 'Masala blend tea with bold flavor.', 1),
  item('Irani Chai', 'Tea', 30, 'Creamy Irani style tea.'),
  item('Sulaimani Tea', 'Tea', 25, 'Clear spiced tea with lemon touch.'),

  item('Hot Milk', 'Milk', 25, 'Fresh hot milk.'),
  item('Badam Milk', 'Milk', 35, 'Milk infused with almond essence.'),
  item('Rose Milk Hot', 'Milk', 35, 'Warm rose-flavored milk.'),
  item('Turmeric Milk', 'Milk', 35, 'Golden milk with turmeric.'),
  item('Honey Milk', 'Milk', 40, 'Mildly sweet milk with honey.'),
  item('Kesar Milk', 'Milk', 45, 'Saffron milk with premium taste.'),

  item('Filter Coffee', 'Coffee', 25, 'Strong South Indian filter coffee.'),
  item('Espresso', 'Coffee', 49, 'Bold espresso shot.'),
  item('Americano', 'Coffee', 59, 'Espresso with hot water.'),
  item('Cappuccino', 'Coffee', 69, 'Frothy cappuccino with balanced flavor.'),
  item('Cafe Latte', 'Coffee', 79, 'Smooth latte with milk foam.'),
  item('Cafe Mocha', 'Coffee', 89, 'Coffee blended with chocolate.'),
  item('Cold Coffee', 'Coffee', 69, 'Chilled coffee with creamy texture.'),
  item('Caramel Coffee', 'Coffee', 89, 'Coffee with caramel sweetness.'),
  item('Vanilla Coffee', 'Coffee', 89, 'Coffee with vanilla notes.'),
  item('Hazelnut Coffee', 'Coffee', 99, 'Rich hazelnut flavored coffee.'),

  item('Lemon Cooler', 'Coolers', 49, 'Chilled lemon cooler.'),
  item('Mint Cooler', 'Coolers', 49, 'Minty refreshing cooler.'),
  item('Watermelon Cooler', 'Coolers', 59, 'Summer watermelon cooler.'),
  item('Orange Cooler', 'Coolers', 59, 'Citrusy orange cooler.'),
  item('Pineapple Cooler', 'Coolers', 59, 'Tropical pineapple cooler.'),
  item('Cucumber Cooler', 'Coolers', 59, 'Hydrating cucumber cooler.'),

  item('Fruit Punch', 'Mocktails', 59, 'Mixed fruit punch mocktail.'),
  item('Mint Mojito', 'Mocktails', 59, 'Lime mint mojito style drink.'),
  item('Kiwi Delight', 'Mocktails', 59, 'Sweet and tangy kiwi mocktail.'),
  item('Orange Temptation', 'Mocktails', 59, 'Orange-based sparkling mocktail.'),
  item('Pineapple Blast', 'Mocktails', 59, 'Pineapple burst mocktail.'),
  item('Pomegranate Blast', 'Mocktails', 59, 'Pomegranate cool mocktail.'),
  item('Blue Lagoon', 'Mocktails', 59, 'Signature blue lagoon mocktail.'),
  item('Virgin Mary', 'Mocktails', 69, 'Spiced tomato mocktail.', 1),
  item('Green Apple Fizz', 'Mocktails', 69, 'Green apple sparkling cooler.'),
  item('Cranberry Spritz', 'Mocktails', 69, 'Cranberry fizzy mocktail.'),

  item('Rose Milk', 'Milk Shakes', 49, 'Classic rose milkshake.'),
  item('Vanilla Milk', 'Milk Shakes', 49, 'Smooth vanilla milkshake.'),
  item('Strawberry Milk', 'Milk Shakes', 59, 'Creamy strawberry milkshake.'),
  item('Mango Shake', 'Milk Shakes', 59, 'Mango shake with real pulp.'),
  item('Banana Shake', 'Milk Shakes', 59, 'Banana blended thick shake.'),
  item('Watermelon Shake', 'Milk Shakes', 59, 'Light watermelon milkshake.'),
  item('Chocolate Shake', 'Milk Shakes', 69, 'Rich chocolate milkshake.'),
  item('Butterscotch Shake', 'Milk Shakes', 69, 'Caramel butterscotch shake.'),

  item('Sweet Lassi', 'Lassi', 49, 'Traditional sweet lassi.'),
  item('Salt Lassi', 'Lassi', 49, 'Refreshing salted lassi.'),
  item('Mango Lassi', 'Lassi', 59, 'Mango flavored lassi.'),
  item('Rose Lassi', 'Lassi', 59, 'Rose essence lassi.'),
  item('Dry Fruit Lassi', 'Lassi', 69, 'Lassi loaded with dry fruits.'),

  item('Vanilla Scoop', 'Icecreams', 39, 'Creamy vanilla scoop.'),
  item('Chocolate Scoop', 'Icecreams', 39, 'Classic chocolate scoop.'),
  item('Strawberry Scoop', 'Icecreams', 39, 'Fresh strawberry scoop.'),
  item('Butterscotch Scoop', 'Icecreams', 39, 'Crunchy butterscotch scoop.'),
  item('Black Currant Scoop', 'Icecreams', 49, 'Black currant flavored scoop.'),
  item('Kulfi Scoop', 'Icecreams', 49, 'Traditional kulfi style scoop.'),

  item('Oreo SP Shake', 'SP Shakes', 99, 'Special Oreo loaded shake.'),
  item('KitKat SP Shake', 'SP Shakes', 99, 'Special KitKat crunchy shake.'),
  item('Brownie SP Shake', 'SP Shakes', 109, 'Brownie chunks special shake.'),
  item('Ferrero SP Shake', 'SP Shakes', 119, 'Ferrero style premium shake.'),
  item('Lotus Biscoff SP Shake', 'SP Shakes', 119, 'Lotus biscoff special shake.'),
  item('Dry Fruit SP Shake', 'SP Shakes', 119, 'Loaded dry fruit special shake.'),

  item('Belgian Chocolate Shake', 'Premium Shakes', 129, 'Belgian chocolate premium shake.'),
  item('Red Velvet Shake', 'Premium Shakes', 129, 'Red velvet dessert style shake.'),
  item('Blueberry Cheesecake Shake', 'Premium Shakes', 139, 'Blueberry cheesecake inspired shake.'),
  item('Salted Caramel Shake', 'Premium Shakes', 139, 'Salted caramel premium shake.'),
  item('Nutella Shake', 'Premium Shakes', 149, 'Nutella rich thick shake.'),
  item('Tender Coconut Shake', 'Premium Shakes', 149, 'Tender coconut creamy shake.'),
  item('Avocado Honey Shake', 'Premium Shakes', 149, 'Avocado and honey health shake.'),

  item('Osmania Biscuit', 'Snacks', 5, 'Classic tea-time Osmania biscuit.', 0, true, 4.1),
  item('Samosa', 'Snacks', 7, 'Crispy potato samosa.', 2, true, 4.3),
  item('Veg Puff', 'Snacks', 25, 'Flaky veg puff.', 1, true, 4.2),
  item('Egg Puff', 'Snacks', 25, 'Flaky puff with egg filling.', 1, true, 4.2),
  item('Omelette', 'Snacks', 19, 'Freshly made omelette.', 1, true, 4.2),
  item('Double Egg Omelette', 'Snacks', 29, 'Protein rich double egg omelette.', 1, true, 4.3),
  item('Bread Omelette', 'Snacks', 39, 'Bread served with masala omelette.', 1, true, 4.3),
  item('Veg Sandwich', 'Snacks', 49, 'Toasted veg sandwich.', 0, true, 4.2),
  item('Cheese Sandwich', 'Snacks', 59, 'Cheesy grilled sandwich.', 0, true, 4.3),
  item('French Fries', 'Snacks', 69, 'Crispy salted fries.', 0, true, 4.3),
  item('Paneer Roll', 'Snacks', 79, 'Soft roll with paneer filling.', 1, true, 4.3),
  item('Chicken Roll', 'Snacks', 89, 'Spicy chicken roll.', 2, false, 4.4),
];
