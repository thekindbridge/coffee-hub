export const scrollToSectionOrTop = (sectionId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.setTimeout(() => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 50);
};
