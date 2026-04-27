import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getLocale } from '@/utils/getLocale';

function renderEditorJsBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return null;
  return blocks.map((block, idx) => {
    if (block.type === 'paragraph') {
      // เพิ่ม pt-4 เฉพาะ block แรก
      // Ensure only text content is within the div, not the classes
      const cls = idx === 0 ? "px-2 pt-4 pb-0" : "p-2";
      return <div key={block.id} className={cls} dangerouslySetInnerHTML={{ __html: block.data.text }} />;
    }
    // เพิ่ม switch-case สำหรับ block แบบอื่นๆต่อไปได้ตามต้องการ
    return null;
  });
}

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function Contact() {
  // Use null or a string like 'campus-0' to track which item is open
  const [opened, setOpened] = useState(null);
  const [contactData, setContactData] = useState({
    campuses: [],
    area: [],
    students: [],
    general: [],
    downloads: []
  });

  const pathname = usePathname();
  const locale = getLocale(pathname);

  useEffect(() => {
    fetch(`${BASE_URL}/items/contact?filter[status][_eq]=published`)
      .then(response => response.json())
      .then(data => {
        var grouped = {
          campuses: [],
          area: [],
          students: [],
          general: [],
          downloads: []
        };

        data.data.forEach(item => {
          switch (item.category) {
            case "1": grouped.campuses.push(item); break;
            case "2": grouped.area.push(item); break;
            case "3": grouped.students.push(item); break;
            case "4": grouped.general.push(item); break;
            case "5": grouped.downloads.push(item); break;
            default: break;
          }
        });
        setContactData(grouped);
      });
  }, []);

  // Updated handleClick to take a group name and index
  const handleClick = (group, idx) => {
    const key = `${group}-${idx}`;
    setOpened(opened === key ? null : key);
  };

  const isCampusOpen = (idx) => opened === `campus-${idx}`;
  const isAreaOpen = (idx) => opened === `area-${idx}`;

  return (
    <section className="bg-brand-900 pt-16 pb-8 px-8">
      <div id="contact" className="max-w-7xl mx-auto md:grid text-sm py-0 md:py-12 md:grid-cols-10 md:gap-20">
        {/* Accordion: Campus */}
        <div id="accordion-dep" className="col-span-3 mb-8 md:mb-0">
          <h3 className="text-xl mb-6 text-white">
            {locale=='th'?'วิทยาเขต':'CAMPUS'}
          </h3>
          <ul className="space-y-1">
            {contactData.campuses.length === 0 ? (
              <li className="text-white text-xs"></li>
            ) : (
              contactData.campuses.sort((a, b) => a.order - b.order).map((campus, idx) => (
                <li
                  key={campus.id}
                  className={`text-white border-b border-brand-700 ${idx === 0 ? 'pb-2' : 'py-2'}`}
                >
                  <button
                    className="flex justify-between w-full items-center focus:outline-none"
                    // Use 'campus' as the group key
                    onClick={() => handleClick('campus', idx)}
                    aria-expanded={isCampusOpen(idx)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <span>
                      {locale=='th'?campus.title_th:campus.title_en}
                    </span>
                    <img
                      src={isCampusOpen(idx)
                        ? "/suweb/img/footer/minus.svg"
                        : "/suweb/img/footer/plus.svg"}
                      alt={isCampusOpen(idx) ? "ปิด" : "เปิด"}
                      width={25}
                      height={24}
                    />
                  </button>
                  {/* Accordion Content */}
                  <div className={`${isCampusOpen(idx) ? "max-h-96" : "max-h-0"} overflow-hidden transition-all duration-[400ms] text-brand-100 text-xs`}>
                    {isCampusOpen(idx) &&
                      renderEditorJsBlocks(
                        locale === 'th'
                          ? campus.location_th?.blocks
                          : campus.location_en?.blocks
                      )
                    }
                  </div>
                </li>
              ))
            )}
          </ul>
          
          <h3 className="text-xl my-6 text-white">
            {locale=='th'?'พื้นที่การศึกษา':'EDUCATION AREAS'}
            </h3>
          <ul className="space-y-1">
            {contactData.area.length === 0 ? (
              <li className="text-white text-xs"></li>
            ) : (
              contactData.area.sort((a, b) => a.order - b.order).map((area, idx) => (
                <li
                  key={area.id}
                  className={`text-white border-b border-brand-700 ${idx === 0 ? 'pb-2' : 'py-2'}`}
                >
                  <button
                    className="flex justify-between w-full items-center focus:outline-none"
                    // Use 'area' as the group key
                    onClick={() => handleClick('area', idx)}
                    aria-expanded={isAreaOpen(idx)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <span>
                      {locale=='th'?area.title_th:area.title_en}
                    </span>
                    <img
                      src={isAreaOpen(idx)
                        ? "/suweb/img/footer/minus.svg"
                        : "/suweb/img/footer/plus.svg"}
                      alt={isAreaOpen(idx) ? "ปิด" : "เปิด"}
                      width={25}
                      height={24}
                    />
                  </button>
                  {/* Accordion Content */}
                  <div className={`${isAreaOpen(idx) ? "max-h-96" : "max-h-0"} overflow-hidden transition-all duration-[400ms] text-brand-100 text-xs`}>
                    {isAreaOpen(idx) && renderEditorJsBlocks(
                      locale === 'th'
                          ? area.location_th?.blocks
                          : area.location_en?.blocks
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        {/* นักศึกษา */}
        <div className="col-span-2 mb-8 md:mb-0">
          <h3 className="text-xl mb-6 text-white">
            {locale=='th'?'นักศึกษา':'STUDENT'}
          </h3>
          <ul className="space-y-1">
            {contactData.students.length === 0 ? (
              <li className="py-1 text-white text-xs"></li>
            ) : (
              contactData.students.sort((a, b) => a.order - b.order).map(item => (
                <li key={item.id} className="py-1">
                  <a target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-100" href={item.link || '#'}>
                    {locale=='th'?item.title_th:item.title_en}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
        {/* คณะวิชา */}
        <div className="col-span-3 mb-8 md:mb-0">
          <h3 className="text-xl mb-6 text-white">
            {locale=='th'?'คณะวิชา':'FACULTY'}
          </h3>
          <ul className="space-y-1">
            {contactData.downloads.length === 0 ? (
              <li className="py-1 text-white text-xs"></li>
            ) : (
              contactData.downloads.sort((a, b) => a.order - b.order).map(item => (
                <li key={item.id} className="py-1">
                  <a target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-100" href={item.link || '#'}>
                    {locale=='th'?item.title_th:item.title_en}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
        {/* หน่วยงานอื่นๆ */}
        <div className="col-span-2 mb-8 md:mb-0">
          <h3 className="text-xl mb-6 text-white">
            {locale=='th'?'หน่วยงานอื่นๆ':'OTHER UNITS'}
          </h3>
          <ul className="space-y-1">
            {contactData.general.length === 0 ? (
              <li className="py-1 text-white text-xs"></li>
            ) : (
              contactData.general.sort((a, b) => a.order - b.order).map(item => (
                <li key={item.id} className="py-1">
                  <a target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-100" href={item.link || '#'}>
                    {locale=='th'?item.title_th:item.title_en}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}