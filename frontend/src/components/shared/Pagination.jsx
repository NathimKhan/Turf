import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button.jsx";

export function Pagination({ page = 1, totalPages = 4 }) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      <Button aria-label="Previous page" size="icon" variant="outline">
        <ChevronLeft size={18} />
      </Button>
      {Array.from({ length: totalPages }).map((_, index) => {
        const pageNumber = index + 1;

        return (
          <Button key={pageNumber} size="icon" variant={pageNumber === page ? "primary" : "outline"}>
            {pageNumber}
          </Button>
        );
      })}
      <Button aria-label="Next page" size="icon" variant="outline">
        <ChevronRight size={18} />
      </Button>
    </nav>
  );
}
