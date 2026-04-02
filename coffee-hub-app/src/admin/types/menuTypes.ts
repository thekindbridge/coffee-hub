export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  spice_level: number;
  is_veg: boolean;
  rating: number;
  image_url: string;
  description: string;
  is_available: boolean;
}

export type AdminMenuFormState = {
  name: string;
  category: string;
  price: string;
  image: string;
  spiceLevel: string;
  veg: boolean;
};

export const INITIAL_MENU_FORM_STATE: AdminMenuFormState = {
  name: '',
  category: '',
  price: '',
  image: '',
  spiceLevel: '0',
  veg: true,
};
