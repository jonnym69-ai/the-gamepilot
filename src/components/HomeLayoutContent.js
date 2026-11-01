import React from 'react';

export function getTodayLayoutStyle() {
  return {
    '--home-today-columns': 'minmax(0, 1.2fr) minmax(0, 1fr)',
    '--home-today-areas': '"doodle doodle" "strip strip" "play spotlight" "story spotlight"',
    '--home-today-width': '1240px',
    '--home-today-padding': '24px',
    '--home-today-art-width': '120px',
    '--home-today-border-width': '1px',
  };
}

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

export default function HomeLayoutContent({ children, view }) {
  const hasClass = (child, className) => (child.props?.className || '').split(' ').includes(className);
  const sections = React.Children.toArray(children).filter((child) => {
    if (view) return (VIEW_SECTIONS[view] || []).some((name) => hasClass(child, name));
    return true;
  });
  const priority = (child) => {
    if (view === 'discover' && hasClass(child, 'home-discovery-highlights')) return -2;
    if (view === 'discover' && hasClass(child, 'home-tools-section')) return -1;
    return 0;
  };
  sections.sort((left, right) => priority(left) - priority(right));

  return <main className="home-layout-content">{sections}</main>;
}
