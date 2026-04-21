'use client';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export default function PopupNews() {
  const [newsList, setNewsList] = useState([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);


  const shouldShow = () => {
    const hideUntil = localStorage.getItem('popupNewsHideUntil');
    if (!hideUntil) return true;
    return new Date() > new Date(hideUntil);
  };

  const hideToday = () => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    localStorage.setItem('popupNewsHideUntil', midnight.toISOString());
    setVisible(false);
  };

  useEffect(() => {
    if (!shouldShow()) return;

    fetch('https://dev-app-bdt.su.ac.th/suadmin/items/landing_page?filter[status][_eq]=published')
      .then(res => res.json())
      .then(data => {
        const today = dayjs();
        const filtered = data.data.filter(item =>
          today.isAfter(dayjs(item.date_start)) &&
          today.isBefore(dayjs(item.date_end).endOf('day'))
        );

        if (filtered.length > 0) {
          setNewsList(filtered);
          setVisible(true);
        }
      });
  }, []);

  if (!visible || newsList.length === 0) return null;

  return (
    <div id="news-modal" className="fixed inset-0 bg-black/75 flex items-center justify-center z-[101] px-4">
      <div className="popup-swiper relative max-w-4xl w-full rounded-lg">

        {/* Close */}
        <button
          className="absolute -top-8 right-0 md:-right-8 text-white text-xl z-20"
          onClick={() => setVisible(false)}
        >
          ✕
        </button>
        <button className="swiper-prev custom-nav">
          ‹
        </button>
        {/* Swiper */}
        <Swiper
          modules={[Navigation, Autoplay]}
          // modules={[Navigation, Pagination, Autoplay]}
          navigation={{
            prevEl: '.swiper-prev',
            nextEl: '.swiper-next',
          }}
          // pagination={{ clickable: true }}
          autoplay={{ delay: 6000 }}
          loop={newsList.length > 1}
          className="rounded-lg overflow-hidden z-[998]"
        >
          {newsList.map((item, index) => (
            <SwiperSlide key={index} className="">
              <div>
                <img
                  src={`https://dev-app-bdt.su.ac.th/suadmin/assets/${item.image}`}
                  alt={item.title == '' || item.title == null ? item.image : item.title}
                  className="w-full rounded-lg"
                  width={960}
                  height={540}
                />

                <div className="p-6 text-center space-y-4 relative">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      className="inline-block px-4 py-2 bg-brand-500 text-white rounded
                        absolute bottom-0 left-1/2 -translate-x-1/2"
                    >
                      {item.title}
                    </a>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <button className="swiper-next custom-nav">
          ›
        </button>

        {/* Hide today */}
        {/* <button
          className="md:hidden absolute -top-8 -right-8 text-white text-xl z-20 mx-4"
          onClick={() => setVisible(false)}
        >
          ปิด
        </button> */}
        <button
          onClick={hideToday}
          className="block ml-auto text-white underline underline-offset-4 
            hover:text-brand-200 absolute bottom-2 right-0 cursor-pointer z-[999]"
        >
          ไม่แสดงอีกวันนี้
        </button>
      </div>
    </div>
  );
}