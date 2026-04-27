// Tailwind CSS safelist — static strings so Tailwind v4 scanner detects them.
// Dynamic CMS classes (built via template literals) are invisible at build time;
// listing them here guarantees they are generated in the CSS bundle.

// prettier-ignore
const _ = [
  // max-w
  'max-w-xs','max-w-sm','max-w-md','max-w-lg','max-w-xl',
  'max-w-2xl','max-w-3xl','max-w-4xl','max-w-5xl','max-w-6xl','max-w-7xl',
  'max-w-full','max-w-screen','max-w-none','max-w-fit','max-w-min','max-w-max','max-w-prose',

  // grid-cols
  'grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4','grid-cols-5','grid-cols-6',
  'grid-cols-7','grid-cols-8','grid-cols-9','grid-cols-10','grid-cols-11','grid-cols-12',
  'md:grid-cols-1','md:grid-cols-2','md:grid-cols-3','md:grid-cols-4','md:grid-cols-5','md:grid-cols-6',
  'md:grid-cols-7','md:grid-cols-8','md:grid-cols-9','md:grid-cols-10','md:grid-cols-11','md:grid-cols-12',
  'lg:grid-cols-1','lg:grid-cols-2','lg:grid-cols-3','lg:grid-cols-4','lg:grid-cols-5','lg:grid-cols-6',
  'lg:grid-cols-7','lg:grid-cols-8','lg:grid-cols-9','lg:grid-cols-10','lg:grid-cols-11','lg:grid-cols-12',

  // gap
  'gap-0','gap-1','gap-2','gap-3','gap-4','gap-5','gap-6','gap-7','gap-8',
  'gap-9','gap-10','gap-11','gap-12','gap-14','gap-16','gap-20','gap-24',
  'gap-x-0','gap-x-1','gap-x-2','gap-x-3','gap-x-4','gap-x-5','gap-x-6','gap-x-7','gap-x-8',
  'gap-x-9','gap-x-10','gap-x-11','gap-x-12','gap-x-14','gap-x-16','gap-x-20','gap-x-24',
  'gap-y-0','gap-y-1','gap-y-2','gap-y-3','gap-y-4','gap-y-5','gap-y-6','gap-y-7','gap-y-8',
  'gap-y-9','gap-y-10','gap-y-11','gap-y-12','gap-y-14','gap-y-16','gap-y-20','gap-y-24',

  // padding — all sides
  'p-0','p-1','p-2','p-3','p-4','p-5','p-6','p-7','p-8','p-9','p-10','p-11','p-12','p-14','p-16','p-20','p-24','p-28','p-32',
  // px
  'px-0','px-1','px-2','px-3','px-4','px-5','px-6','px-7','px-8','px-9','px-10','px-11','px-12','px-14','px-16','px-20','px-24','px-28','px-32',
  // py
  'py-0','py-1','py-2','py-3','py-4','py-5','py-6','py-7','py-8','py-9','py-10','py-11','py-12','py-14','py-16','py-20','py-24','py-28','py-32',
  // pt
  'pt-0','pt-1','pt-2','pt-3','pt-4','pt-5','pt-6','pt-7','pt-8','pt-9','pt-10','pt-11','pt-12','pt-14','pt-16','pt-20','pt-24','pt-28','pt-32',
  // pb
  'pb-0','pb-1','pb-2','pb-3','pb-4','pb-5','pb-6','pb-7','pb-8','pb-9','pb-10','pb-11','pb-12','pb-14','pb-16','pb-20','pb-24','pb-28','pb-32',
  // pl
  'pl-0','pl-1','pl-2','pl-3','pl-4','pl-5','pl-6','pl-7','pl-8','pl-9','pl-10','pl-11','pl-12','pl-14','pl-16','pl-20','pl-24',
  // pr
  'pr-0','pr-1','pr-2','pr-3','pr-4','pr-5','pr-6','pr-7','pr-8','pr-9','pr-10','pr-11','pr-12','pr-14','pr-16','pr-20','pr-24',

  // text alignment
  'text-left','text-center','text-right','text-justify',

  // rounded
  'rounded-none','rounded-sm','rounded-md','rounded-lg','rounded-xl','rounded-2xl','rounded-3xl','rounded-full',
  'rounded-t-none','rounded-t-sm','rounded-t-md','rounded-t-lg','rounded-t-xl','rounded-t-2xl','rounded-t-3xl','rounded-t-full',
]

export default _
