export const setBodyScrollLocked = (isLocked: boolean) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.style.overflow = isLocked ? 'hidden' : 'auto';
};
