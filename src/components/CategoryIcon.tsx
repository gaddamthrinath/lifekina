'use client';

import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface CategoryIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  if (!Icon) {
    const Fallback = LucideIcons.MoreHorizontal;
    return <Fallback {...props} />;
  }
  return <Icon {...props} />;
}
