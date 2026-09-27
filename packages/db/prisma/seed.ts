// Seeds a fresh local database: two demo restaurants, their outlets and menus,
// and test users (phone numbers and codes from supabase/config.toml, same as
// the live demo: 098765 for the customer and staff, 696969 for the owners).
// Run through `pnpm db:reset`, which wipes the database first.
import path from "node:path"

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

import { prisma } from "../src/client"
import type { MembershipRole } from "../src/generated/prisma/client"
import menu from "./seed-data/menu.json" with { type: "json" }

config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
  quiet: true,
})

type Dish = (typeof menu)[number]

// Open every day from 09:00 until 03:00 the next morning, Asia/Kolkata. Long
// hours so the demo can be tried at almost any time; the span past midnight
// also exercises overnight hours.
const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const everyDay = Object.fromEntries(days.map((d) => [d, [["09:00", "03:00"]]]))

const legal = (name: string) => ({
  about: `${name} is a demo restaurant on Biscotti.`,
  privacy: "Demo restaurant. Orders placed here are test orders.",
  refund: "Demo restaurant. No real payments are taken.",
  terms: "Demo restaurant, for testing only.",
})

const restaurants = [
  {
    name: "Casa Spezia",
    slug: "casa-spezia",
    theme: {
      preset: "classic",
      primary: "#8a2c12",
      accent: "#b08d57",
      tagline:
        "Tandoor, curries and Indo-Chinese favourites, cooked fresh to order.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1742281258189-3b933879867a",
    },
    locations: [
      { name: "Kharar", address: "Kharar, Punjab", lat: 30.7464, lng: 76.6469 },
      {
        name: "Zirakpur",
        address: "VIP Road, Zirakpur, Punjab",
        lat: 30.6425,
        lng: 76.8173,
      },
      {
        name: "Chandigarh",
        address: "Industrial Area Phase I, Chandigarh",
        lat: 30.7056,
        lng: 76.8013,
      },
    ],
    dishes: menu,
    featured: [
      "Butter Chicken with Bone",
      "Dal Makhni",
      "Achari Paneer Tikka",
      "Mutton Biryani",
    ],
  },
  {
    // Second tenant, used to check that restaurants cannot see each other's data.
    name: "Osteria Sole",
    slug: "osteria-sole",
    theme: {
      preset: "vibrant",
      primary: "#ea580c",
      accent: "#f59e0b",
      tagline: "Momos, noodles and fiery Indo-Chinese, made for sharing.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe",
    },
    locations: [
      {
        name: "Mohali",
        address: "Phase 7, Mohali, Punjab",
        lat: 30.7046,
        lng: 76.7179,
      },
    ],
    dishes: menu.filter((d) =>
      [
        "Veg Spring Roll",
        "Veg Momos",
        "Chicken Momos",
        "Hakka Noodles",
        "Chicken Hakka Noodles",
        "Veg Manchurian Dry",
        "Chilli Chicken Boneless",
        "Schezwan Fried Rice",
      ].includes(d.title)
    ),
    featured: [
      "Chicken Momos",
      "Chilli Chicken Boneless",
      "Hakka Noodles",
      "Veg Spring Roll",
    ],
  },
]

const users: {
  phone: string
  name: string
  restaurant?: string
  role?: MembershipRole
}[] = [
  { phone: "+919999900001", name: "Test Customer" },
  {
    phone: "+919999900002",
    name: "Casa Spezia Staff",
    restaurant: "casa-spezia",
    role: "staff",
  },
  {
    phone: "+919999900003",
    name: "Casa Spezia Owner",
    restaurant: "casa-spezia",
    role: "owner",
  },
  {
    phone: "+919999900004",
    name: "Osteria Sole Owner",
    restaurant: "osteria-sole",
    role: "owner",
  },
]

async function seedRestaurant(r: (typeof restaurants)[number]) {
  const restaurant = await prisma.restaurant.create({
    data: { name: r.name, slug: r.slug, theme: r.theme, legal: legal(r.name) },
  })

  await prisma.location.createMany({
    data: r.locations.map((l) => ({
      ...l,
      restaurantId: restaurant.id,
      hours: everyDay,
      deliveryFeePaise: 3000,
      packagingFeePaise: 2000,
      taxBps: 500,
    })),
  })

  // Categories in menu order (the seed file is already sorted).
  const names = [...new Set(r.dishes.map((d: Dish) => d.category))]
  const categoryId = new Map<string, string>()
  for (const [sort, name] of names.entries()) {
    const c = await prisma.category.create({
      data: { restaurantId: restaurant.id, name, sort },
    })
    categoryId.set(name, c.id)
  }

  await prisma.menuItem.createMany({
    data: r.dishes.map((d: Dish) => ({
      restaurantId: restaurant.id,
      categoryId: categoryId.get(d.category)!,
      title: d.title,
      description: d.description,
      pricePaise: d.pricePaise,
      isVeg: d.isVeg,
      imageUrl: d.imageUrl,
      isFeatured: r.featured.includes(d.title),
    })),
  })

  console.log(
    `  ${r.name}: ${r.locations.length} outlets, ${names.length} categories, ${r.dishes.length} dishes`
  )
  return restaurant
}

async function seedUsers(restaurantIds: Map<string, string>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env"
    )
  }
  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false },
  })

  for (const u of users) {
    // Creating the auth user fires the trigger that inserts the profile.
    const { data, error } = await supabase.auth.admin.createUser({
      phone: u.phone,
      phone_confirm: true,
      user_metadata: { name: u.name },
    })
    if (error) throw new Error(`creating ${u.phone}: ${error.message}`)

    if (u.restaurant && u.role) {
      await prisma.membership.create({
        data: {
          userId: data.user.id,
          restaurantId: restaurantIds.get(u.restaurant)!,
          role: u.role,
        },
      })
    }
    console.log(`  ${u.phone}  ${u.name}${u.role ? ` (${u.role})` : ""}`)
  }
}

async function main() {
  console.log("Restaurants:")
  const ids = new Map<string, string>()
  for (const r of restaurants) {
    const created = await seedRestaurant(r)
    ids.set(r.slug, created.id)
  }
  console.log("Users (codes: 098765 customer and staff, 696969 owners):")
  await seedUsers(ids)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
