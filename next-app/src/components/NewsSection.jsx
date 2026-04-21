'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/th';
import { usePathname } from 'next/navigation'
import { getLocale } from '@/utils/getLocale';

dayjs.extend(relativeTime);

function formatRelative(date, locale) {
  return dayjs(date)
    .locale(locale === 'th' ? 'th' : 'en')
    .fromNow();
}

function getImageUrl(image) {
  if (!image) return './img/news/default.png';
  return `https://dev-app-bdt.su.ac.th/suadmin/assets/${image}`;
}

export default function NewsSection({
  title1_th = 'ข่าวสาร',
  title1_en = 'News',
  title2_th = 'กิจกรรม',
  title2_en = 'Activity',
  showSeeAll = true,
  collectionName = 'news',
  collectionCategoryName = 'news_category'
}) {
  const pathname = usePathname();
  const locale = getLocale(pathname);

  const [news, setNews] = useState({});
  const [categories, setCategories] = useState([]);
  const [isThai, setIsThai] = useState(true);

  useEffect(() => {
    const lang = navigator.language || 'th';
    setIsThai(lang.startsWith('th'));

    // Fetch grouped news (category 1, 2)
    fetch(`https://dev-app-bdt.su.ac.th/suadmin/items/news?sort=-date_created&filter[category][_in]=1,3&filter[status][_eq]=published`)
      .then(res => res.json())
      .then(data => {
        if (data?.data) {
          const grouped = data.data.reduce((acc, item) => {
            const cat = item.category || 'unknown';
            if (!acc[cat]) acc[cat] = [];
            if (acc[cat].length < 2) acc[cat].push(item);
            return acc;
          }, {});
          setNews(grouped);
        }
      })
      .catch(err => console.error('Error fetching grouped news:', err));

    // Fetch categories
    fetch(`https://dev-app-bdt.su.ac.th/suadmin/items/${collectionCategoryName}`)
      .then(res => res.json())
      .then(data => {
        if (data?.data) setCategories(data.data);
      })
      .catch(err => console.error('Error fetching news_category:', err));
  }, []);

  const getCategoryName = (categoryId, locale) => {
    const catObj = categories.find(cat => cat.id === Number(categoryId));
    if (!catObj) return '';
    return locale === 'en' ? catObj.title_en : catObj.title_th;
  };

  const newsEntries = Object.entries(news); // [[categoryId, items], ...]

  return (
    <section className="news bg-white py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {newsEntries.map(([catId, items]) => (
          <div key={catId}>
            <h3 className="text-3xl font-medium text-system-500 mb-4 text-center">
              {getCategoryName(Number(catId), locale) ||
                (locale === 'th'
                  ? catId === '1' ? title1_th : title2_th
                  : catId === '1' ? title1_en : title2_en)}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={"rounded" + (index > 1 ? " hidden md:block" : "")}
                >
                  <Link href={`/suweb/${locale}/news/${item.id}`}>
                    <div className="w-full aspect-[4/3] overflow-hidden mb-4">
                      <img
                        src={getImageUrl(item.image)}
                        alt="News Thumbnail"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  </Link>
                  <h3 className="text-sm line-clamp-2 leading-2 mb-2 px-6">
                    <h3 className="text-sm line-clamp-2 leading-2 mb-2">
                      {locale === 'th' ? item.title_th : item.title_en == '' || item.title_en == null ? item.title_th : item.title_en}
                    </h3>
                  </h3>
                  <div className="flex justify-between mb-2 px-6">
                    <p className="text-xs text-brand-500 text-light line-clamp-3 leading-2">
                      {getCategoryName(item.category, locale)}
                    </p>
                    <p className="text-xs text-brand-500 text-light line-clamp-3 leading-2">
                      {formatRelative(item.date_updated, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showSeeAll && (
        <div className="text-center mt-6 col-span-2">
          <Link href={`/suweb/${locale}/news`}>
            <button className="bg-brand-500 text-white px-6 py-4 rounded inline-flex items-center">
              <span className="mr-2">
                <span className="mr-2">
                  {locale === 'th' ? 'ดูทั้งหมด' : 'See more'}
                </span>
              </span>
              <img
                className="inline-block w-4 h-4"
                src="./img/program/Arrow-right.svg"
                alt="next"
                width={25}
                height={24}
              />
            </button>
          </Link>
        </div>
      )}
    </section>
  );
}
