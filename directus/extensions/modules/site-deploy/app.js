import { defineComponent, ref, h } from 'vue';
import { defineModule } from '@directus/extensions-sdk';

const DEFAULT_API = 'http://127.0.0.1:9901';
const LS_KEY = 'deploy_server_url';

const DeployPage = defineComponent({
  setup() {
    const apiUrl = ref(localStorage.getItem(LS_KEY) || DEFAULT_API);
    const output = ref('');
    const loading = ref(false);
    const success = ref(null); // null | true | false

    function saveUrl() {
      localStorage.setItem(LS_KEY, apiUrl.value);
    }

    async function call(endpoint) {
      loading.value = true;
      output.value = '';
      success.value = null;
      saveUrl();
      try {
        const res = await fetch(`${apiUrl.value}${endpoint}`, { method: 'POST' });
        const data = await res.json();
        output.value = data.output || '';
        success.value = data.success;
      } catch (e) {
        output.value = `เชื่อมต่อ deploy-server ไม่ได้: ${e.message}\n\nตรวจสอบว่ารัน "node scripts/deploy-server.js" แล้วหรือยัง`;
        success.value = false;
      } finally {
        loading.value = false;
      }
    }

    const btnStyle = (color, disabled) => ({
      background: disabled ? '#ccc' : color,
      color: 'white',
      border: 'none',
      padding: '0.6rem 1.4rem',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.9rem',
      fontWeight: '500',
      transition: 'opacity 0.2s',
    });

    const cardStyle = {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '1.5rem',
      marginBottom: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    };

    return () => h('div', { style: 'padding: 2rem; max-width: 820px; font-family: inherit;' }, [

      h('h1', { style: 'font-size: 1.4rem; font-weight: 700; margin: 0 0 0.3rem 0; color: #1e293b;' }, 'Deploy Site'),
      h('p', { style: 'color: #64748b; margin: 0 0 2rem 0; font-size: 0.9rem;' },
        'Pull code จาก Git และ Restart Next.js ผ่าน Docker Compose'),

      // ── Server URL settings ──────────────────────────────────────────
      h('div', { style: cardStyle }, [
        h('label', { style: 'display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;' }, 'Deploy Server URL'),
        h('div', { style: 'display: flex; gap: 0.5rem; align-items: center;' }, [
          h('input', {
            value: apiUrl.value,
            onInput: e => { apiUrl.value = e.target.value; },
            style: 'flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; color: #334155;',
            placeholder: DEFAULT_API,
          }),
          h('button', { onClick: saveUrl, style: btnStyle('#475569', false) }, 'บันทึก'),
        ]),
        h('p', { style: 'margin: 0.5rem 0 0 0; font-size: 0.78rem; color: #94a3b8;' },
          'รัน: node scripts/deploy-server.js บน host machine'),
      ]),

      // ── Actions ──────────────────────────────────────────────────────
      h('div', { style: { ...cardStyle, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' } }, [
        h('button', {
          onClick: () => call('/git-pull'),
          disabled: loading.value,
          style: btnStyle('#3b82f6', loading.value),
        }, loading.value ? '⏳ กำลังทำงาน...' : '⬇️  Git Pull'),

        h('button', {
          onClick: () => call('/docker-restart'),
          disabled: loading.value,
          style: btnStyle('#10b981', loading.value),
        }, loading.value ? '⏳ กำลังทำงาน...' : '🐳 Docker Compose (Build + Restart)'),

        h('button', {
          onClick: () => call('/deploy'),
          disabled: loading.value,
          style: btnStyle('#6366f1', loading.value),
        }, loading.value ? '⏳ กำลัง Deploy...' : '🚀 Deploy (Git Pull + Docker)'),
      ]),

      // ── Output ───────────────────────────────────────────────────────
      output.value !== '' && h('div', {
        style: {
          ...cardStyle,
          background: success.value === false ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${success.value === false ? '#fca5a5' : '#86efac'}`,
        }
      }, [
        h('div', { style: 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;' }, [
          h('span', { style: 'font-size: 1rem;' }, success.value === false ? '❌' : '✅'),
          h('span', { style: `font-weight: 600; font-size: 0.9rem; color: ${success.value === false ? '#dc2626' : '#16a34a'};` },
            success.value === false ? 'เกิดข้อผิดพลาด' : 'สำเร็จ'),
        ]),
        h('pre', {
          style: 'margin: 0; font-size: 0.78rem; white-space: pre-wrap; word-break: break-all; color: #334155; line-height: 1.5;'
        }, output.value),
      ]),

    ]);
  }
});

export default defineModule({
  id: 'site-deploy',
  name: 'Deploy',
  icon: 'rocket_launch',
  routes: [
    { path: '', component: DeployPage }
  ],
});
