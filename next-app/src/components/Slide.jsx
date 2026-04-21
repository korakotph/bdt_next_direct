// components/Silde.jsx
"use client";

import '../styles/slide.scss';

export default function Silde() {
  return (
    <section className="bg-brand-50 py-6 overflow-hidden">
      <div className="relative w-full">
        <div
          className="whitespace-nowrap flex animate-marquee"
          // style={{ animation: 'marquee 20s linear infinite' }}
          style={{ transform : 'translateX(-25vw)'}}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex">
              <h2 className="text-5xl text-light text-brand-500 inline-block mr-8 font-silpakorn-70">
                SILPAKORN UNIVERSITY
              </h2>
              <h2 className="text-5xl text-light text-brand-500 inline-block mr-8 font-silpakorn-70">
                มหาวิทยาลัยศิลปากร
              </h2>
              <h2 className="text-5xl text-light text-brand-500 inline-block mr-8 font-silpakorn-70">
                SILPAKORN UNIVERSITY
              </h2>
              <h2 className="text-5xl text-light text-brand-500 inline-block mr-8 font-silpakorn-70">
                มหาวิทยาลัยศิลปากร
              </h2>
              <h2 className="text-5xl text-light text-brand-500 inline-block mr-8 font-silpakorn-70">
                SILPAKORN UNIVERSITY
              </h2>
              <h2 className="text-5xl text-light text-brand-500 inline-block mr-8 font-silpakorn-70">
                มหาวิทยาลัยศิลปากร
              </h2>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}