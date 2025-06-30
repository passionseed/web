// Re-export all icons from lucide-react
export * from 'lucide-react';

// Import and re-export specific icons from @icons-pack/react-simple-icons if needed
// Example:
// export { Github } from '@icons-pack/react-simple-icons';
// export { Twitter } from '@icons-pack/react-simple-icons';

// You can also create custom icon components here if needed
// Example:
// import { createElement } from 'react';
// import { Icon as SimpleIcon } from '@icons-pack/react-simple-icons';
// import { LucideIcon } from 'lucide-react';

// Type for all available icon names
export type IconName = 
  | keyof typeof import('lucide-react')
  // | 'github' | 'twitter' // Add any custom icon names here
  ;

// Import Spinner icon explicitly
import { Loader2 as Spinner } from 'lucide-react';

// Type for the Icons object
type Icons = {
  [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Create an Icons object that combines all icons
const Icons: Icons = {
  // Lucide icons are already exported directly
  ...(Object.fromEntries(
    Object.entries(require('lucide-react')).map(([key, value]) => [key, value])
  ) as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>),
  
  // Add any custom icons or overrides here
  // Example:
  // github: (props) => <Github {...props} />,
  // twitter: (props) => <Twitter {...props} />,
  
  // Add Spinner alias (using Loader2 from lucide-react which is the spinner icon)
  spinner: Spinner,
};

export default Icons;
