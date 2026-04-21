'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getLocale } from '@/utils/getLocale';

    // A mapping for static segments
// const segmentMap = {
//     'th': '', // you can skip or keep
//     'suweb': '', // you can skip or keep
//     'news': 'ข่าวสาร',
//     'life': 'ชีวิตในศิลปากร',
//     'program': 'หลักสูตร',
//     'about': 'ประวัติมหาวิทยาลัยศิลปากร'
// };
const segmentMap = {
  th: {
    news: 'ข่าวสาร',
    life: 'ชีวิตในศิลปากร',
    program: 'หลักสูตร',
    about: 'ประวัติมหาวิทยาลัยศิลปากร',
    privacy: 'นโยบายความเป็นส่วนตัว',
    terms: 'ข้อตกลงในการใช้งาน',
    cookie: 'นโยบายการใช้คุกกี้',
  },
  en: {
    news: 'News',
    life: 'Life in campus',
    program: 'Programs',
    about: 'About',
    privacy: 'Privacy Policy',
    terms: 'Term of use',
    cookie: 'Cookie Policy',
  },
};

export default function Breadcrumbs({ newsTitle }) {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);
    const locale = getLocale(pathname)

    const basePath = `/suweb/${locale}`;
    // Real Thai breadcrumb
    const crumbs = [
        {
            label: locale === 'en' ? 'Home' : 'หน้าแรก',
            href: basePath,
        },
    ];

    segments.forEach((seg, idx) => {
        const label = segmentMap[locale]?.[seg];

        if (label) {
            crumbs.push({
            label,
            href: '/' + segments.slice(0, idx + 1).join('/'),
            });
        }

        if (idx === segments.length - 1 && newsTitle) {
            crumbs.push({
            label: newsTitle,
            href: null,
            });
        }
    });

    return (
        <nav aria-label="breadcrumb" className="max-w-7xl mx-auto px-8 pt-10">
            <ol className="flex gap-2 list-none p-0 overflow-hidden whitespace-nowrap">
                {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1;
                const className = isLast ? 'text-brand-500' : 'text-brand-300';
                return (
                    <li
                    key={idx}
                    className={isLast ? "min-w-0 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl flex overflow-hidden" : ""}
                    >
                    {idx !== 0 && (
                        <span className="mx-2 text-brand-300">/</span>
                    )}
                    {crumb.href ? (
                        <Link href={crumb.href} className={className}>{crumb.label}</Link>
                    ) : (
                        <span className={`${className} block truncate`} title={crumb.label}>
                        {crumb.label}
                        </span>
                    )}
                    </li>
                );
                })}
            </ol>
        </nav>
    );
}