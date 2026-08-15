import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES: {
  slug: string;
  name: string;
  emoji: string;
  order: number;
  items: string[];
}[] = [
  {
    slug: "dorm-kid",
    name: "เมนูเด็กหอ",
    emoji: "🏠",
    order: 1,
    items: [
      "ไข่ต้มซีอิ๊ว",
      "ข้าวไข่เจียวหมูสับ",
      "มาม่าไข่ต้ม",
      "ข้าวคลุกไข่ดาว",
      "ปลากระป๋องผัดฉ่า",
      "โจ๊กกึ่งสำเร็จรูปใส่ไข่",
      "ข้าวต้มมัดไส้หมู",
    ],
  },
  {
    slug: "one-dish",
    name: "อาหารจานเดียว",
    emoji: "🍚",
    order: 2,
    items: [
      "ข้าวผัดกุนเชียง",
      "ข้าวหน้าไก่ทอด",
      "ข้าวคลุกกะปิ",
      "ข้าวหมูแดง",
      "ข้าวมันไก่",
      "ข้าวหน้าเป็ด",
      "ผัดซีอิ๊วหมู",
      "ข้าวกะเพราไก่ไข่ดาว",
    ],
  },
  {
    slug: "simple-order",
    name: "อาหารตามสั่งง่ายๆ",
    emoji: "🍳",
    order: 3,
    items: [
      "ผัดกะเพราหมูสับ",
      "ไข่เจียวหมูสับ",
      "ผัดผักรวมมิตร",
      "หมูทอดกระเทียม",
      "ไข่ดาวราดข้าว",
      "ผัดพริกแกงหมู",
      "ต้มจืดเต้าหู้หมูสับ",
      "ไก่ผัดขิง",
    ],
  },
  {
    slug: "broke-spaghetti",
    name: "Spaghetti สิ้นคิด",
    emoji: "🍝",
    order: 4,
    items: [
      "สปาเก็ตตี้ผัดขี้เมา",
      "สปาเก็ตตี้คาโบนาร่าง่ายๆ",
      "สปาเก็ตตี้ซอสมะเขือเทศไข่ดาว",
      "สปาเก็ตตี้ผัดกระเทียมพริกแห้ง",
      "สปาเก็ตตี้ทูน่ากระป๋อง",
      "สปาเก็ตตี้ซอสพริกไทยดำ",
      "สปาเก็ตตี้ครีมเห็ด",
    ],
  },
  {
    slug: "isaan",
    name: "อาหารอีสาน",
    emoji: "🌶️",
    order: 5,
    items: [
      "ส้มตำไทย",
      "ลาบหมู",
      "น้ำตกหมู",
      "ต้มแซ่บกระดูกหมู",
      "ไก่ย่าง",
      "ซุปหน่อไม้",
      "ตำซั่ว",
    ],
  },
  {
    slug: "noodles",
    name: "ก๋วยเตี๋ยว/เส้น",
    emoji: "🍜",
    order: 6,
    items: [
      "ก๋วยเตี๋ยวหมูตุ๋น",
      "ก๋วยเตี๋ยวเรือ",
      "บะหมี่เกี๊ยวหมูแดง",
      "เส้นใหญ่ผัดขี้เมา",
      "ก๋วยเตี๋ยวต้มยำ",
      "ราดหน้าหมู",
      "ผัดไทย",
    ],
  },
  {
    slug: "street-fried",
    name: "ของทอด/สตรีทฟู้ด",
    emoji: "🍢",
    order: 7,
    items: [
      "ไก่ทอดหาดใหญ่",
      "หมูปิ้ง",
      "ลูกชิ้นทอด",
      "เกี๊ยวซ่าทอด",
      "ไข่กระทะ",
      "ปอเปี๊ยะทอด",
      "ไก่ย่างเกลือ",
    ],
  },
  {
    slug: "clean-healthy",
    name: "อาหารคลีน/สุขภาพ",
    emoji: "🥗",
    order: 8,
    items: [
      "สลัดอกไก่ย่าง",
      "ข้าวกล้องผัดผักไข่ต้ม",
      "อกไก่ย่างสมุนไพร",
      "สลัดทูน่า",
      "ต้มยำกุ้งน้ำใส",
      "ข้าวโอ๊ตผัดไข่",
      "ยำวุ้นเส้นอกไก่",
    ],
  },
  {
    slug: "desserts",
    name: "ของหวาน/ของว่าง",
    emoji: "🍧",
    order: 9,
    items: [
      "ข้าวเหนียวมะม่วง",
      "บัวลอย",
      "กล้วยบวชชี",
      "ทับทิมกรอบ",
      "ขนมครก",
      "โรตีกล้วยไข่",
      "เต้าฮวยนมสด",
    ],
  },
  {
    slug: "late-night",
    name: "อาหารมื้อดึก",
    emoji: "🌙",
    order: 10,
    items: [
      "ข้าวต้มกุ้ย",
      "หมูกระทะมินิ",
      "บะหมี่แห้งหมูแดง",
      "ข้าวผัดอเมริกัน",
      "ต้มเลือดหมู",
      "ปลาหมึกย่าง",
      "ข้าวต้มปลา",
    ],
  },
];

async function main() {
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, emoji: cat.emoji, order: cat.order },
      create: {
        slug: cat.slug,
        name: cat.name,
        emoji: cat.emoji,
        order: cat.order,
      },
    });

    for (const itemName of cat.items) {
      await prisma.menuItem.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: itemName,
          },
        },
        update: {},
        create: {
          name: itemName,
          categoryId: category.id,
        },
      });
    }
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories and ${CATEGORIES.reduce(
      (sum, c) => sum + c.items.length,
      0
    )} menu items.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
