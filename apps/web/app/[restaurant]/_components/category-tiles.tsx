import type { MenuCategory } from "@workspace/core"
import Image from "next/image"

// "What are you craving?": one round photo per category, jumping to its section.
export function CategoryTiles({ categories }: { categories: MenuCategory[] }) {
  return (
    <section aria-labelledby="explore-heading">
      <h2
        id="explore-heading"
        className="mb-4 font-display text-2xl font-semibold tracking-tight"
      >
        What are you craving?
      </h2>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {categories.map((category) => {
          const photo = category.menuItems.find((d) => d.imageUrl)?.imageUrl
          return (
            <li key={category.id} className="snap-start">
              <a
                href={`#category-${category.id}`}
                className="group flex w-24 flex-col items-center gap-2"
              >
                <span className="relative size-24 overflow-hidden rounded-full bg-orange-100 shadow-md ring-4 ring-white transition group-hover:scale-105 group-hover:shadow-lg">
                  {photo && (
                    <Image
                      src={`${photo}?w=240&h=240&q=75&auto=format&fit=crop`}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="text-center text-sm leading-tight font-medium">
                  {category.name}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
