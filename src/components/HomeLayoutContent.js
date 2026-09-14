import React from 'react';

export default function HomeLayoutContent({ layoutId, children }) {
  const hasClass = (child, className) => (child.props?.className || '').split(' ').includes(className);
  const sections = React.Children.toArray(children).filter((child) => {
    if (layoutId === 'streamer_overlay') {
      return !['home-persona-section', 'home-buy-next-section', 'home-wishlist-section'].some((name) =>
        hasClass(child, name)
      );
    }
    return layoutId !== 'focus_finder' || !hasClass(child, 'home-persona-section');
  });
  const priority = (child) => {
    if (layoutId === 'focus_finder' && hasClass(child, 'home-tools-section')) return -1;
    if (layoutId === 'streamer_overlay' && hasClass(child, 'home-library-section')) return -1;
    return 0;
  };
  sections.sort((left, right) => priority(left) - priority(right));

  return <main className="home-layout-content">{sections}</main>;
}
