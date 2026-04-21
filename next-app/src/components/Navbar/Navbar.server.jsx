// components/Navbar/Navbar.server.jsx
import NavbarClient from "./Navbar.client";
import { getPages } from "@/lib/directus";

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;

function buildTree(items) {
  const map = {};
  const roots = [];

  items.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  items.forEach(item => {
    if (item.parent) {
      map[item.parent]?.children.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });

  return roots;
}

export default async function Navbar({ settings }) {
  const pages = await getPages();
  
  return (
    <NavbarClient
      settings={settings}
      menu={pages}
    />
  );
}