import React from 'react';

const VIEW_SECTIONS = {
  discover: [
    'home-discovery-highlights',
    'home-discover-section',
    'home-similar-to-recent',
    'home-library-section',
    'home-tools-section',
    'home-backlog-section',
  ],
  activity: ['home-activity-section'],
  identity: ['home-persona-section'],
  wishlist: ['home-wishlist-section', 'home-buy-next-section'],
};

export default function HomeLayoutContent({ layoutId, children, view }) {
  const hasClass = (child, className) => (child.props?.className || '').split(' ').includes(className);
  const sections = React.Children.toArray(children).filter((child) => {
    if (view) return (VIEW_SECTIONS[view] || []).some((name) => hasClass(child, name));
    if (layoutId === 'streamer_overlay') {
      return !['home-persona-section', 'home-buy-next-section', 'home-wishlist-section'].some((name) =>
        hasClass(child, name)
      );
    }
    return layoutId !== 'focus_finder' || !hasClass(child, 'home-persona-section');
  });
  const priority = (child) => {
    if (view === 'discover' && hasClass(child, 'home-discovery-highlights')) return -2;
    if ((view === 'discover' || layoutId === 'focus_finder') && hasClass(child, 'home-tools-section')) return -1;
    if (layoutId === 'streamer_overlay' && hasClass(child, 'home-library-section')) return -1;
    return 0;
  };
  sections.sort((left, right) => priority(left) - priority(right));

  return <main className="home-layout-content">{sections}</main>;
}
