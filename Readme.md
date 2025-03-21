# نظام إدارة المصروفات (Expense Management System)

نظام لإدارة وتتبع المصروفات السنوية للمناسبات، مع دعم كامل للغة العربية وواجهة مستخدم سهلة الاستخدام.

## المميزات

- ✨ واجهة مستخدم عربية بالكامل
- 📱 تصميم متجاوب يعمل على الأجهزة المحمولة
- 📊 مقارنة المصروفات بين السنوات
- 🔍 تصنيف المصروفات حسب الفئات
- 💰 عرض إجمالي المصروفات لكل سنة
- ⚡️ أداء سريع وتحديثات فورية

## التقنيات المستخدمة

- React مع TypeScript
- Tailwind CSS للتصميم
- Lucide React للأيقونات
- React Hook Form لإدارة النماذج
- Axios للتعامل مع API

## متطلبات النظام

- Node.js (الإصدار 18 أو أحدث)
- npm (مدير حزم Node.js)

## التثبيت

```bash
# تثبيت الاعتمادات
npm install

# تشغيل خادم التطوير
npm run dev
```

## هيكل API

يستخدم النظام API من Aitable للتعامل مع البيانات. فيما يلي تفاصيل نقاط النهاية API والبيانات المطلوبة:

### التكوين الأساسي

```typescript
const API_BASE_URL = 'https://aitable.ai/fusion/v1/datasheets/dstD6m6utUlC8Sub2q';
const API_TOKEN = 'uskh2274ZKtAWpN2oGnEdvh';
const VIEW_ID = 'viwAaYyEsS9k7';
```

### هيكل البيانات

```typescript
interface Record {
  recordId?: string;
  fields: {
    Title?: number;
    EidYear: string;        // السنة الهجرية
    Item: string;           // اسم البند
    Unit: string;           // وحدة القياس
    Quantity: number;       // الكمية
    UnitPrice: number;      // سعر الوحدة
    Cost: number;          // التكلفة الإجمالية
    Category: string;       // الفئة بالإنجليزية
    "Category Copy": string; // الفئة بالعربية
  };
}
```

### نقاط النهاية API

#### جلب السجلات
```typescript
GET /records?viewId=${VIEW_ID}&fieldKey=name
```

#### إضافة سجل
```typescript
POST /records?viewId=${VIEW_ID}&fieldKey=name
Body: { records: [Record] }
```

#### تحديث سجل
```typescript
PATCH /records?viewId=${VIEW_ID}&fieldKey=name
Body: { records: [Record] }
```

#### حذف سجل
```typescript
DELETE /records?recordIds=${recordId}
```

### رؤوس الطلبات

```typescript
headers: {
  Authorization: `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json'
}
```

## الفئات المتاحة

- المأكولات والمشروبات (Food & Beverages)
- الخدمات والعمالة (Services & Labor)
- مستلزمات الحفلات والفعاليات (Party & Event Supplies)
- المرافق والتنظيف (Utilities & Cleaning)
- المعدات والمتفرقات (Equipment & Miscellaneous)
- الأجواء والعطور (Ambience & Fragrances)

## المساهمة

نرحب بالمساهمات! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة
3. تقديم طلب سحب (Pull Request)

## الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE).