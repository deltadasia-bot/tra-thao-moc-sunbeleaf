import { useNavigate } from "react-router-dom";
import ProductCard from "./product-card";
import SectionTitle from "./section-title";
import { Product } from "@/types/product.types";
import { useCartStore } from "@/stores/cart.store";
import { getDefaultVariants } from "@/utils/product";
import { getDisplayPromotionalPrice } from "@/utils/promotion";
import { recordProductInterest } from "@/services/search/search-insights.storage";

interface ProductGridProps extends React.HTMLAttributes<HTMLDivElement> {
  products: Product[];
  category?: string;
  categoryImg?: string;
  onProductClick?: (product: Product) => void;
}

export default function ProductGrid({
  products,
  category,
  categoryImg,
  onProductClick,
  ...props
}: ProductGridProps) {
  const navigate = useNavigate();
  const { addToCart, openCheckoutSheet } = useCartStore();

  const handleQuickAddToCart = (product: Product) => {
    const hasManagedStock =
      product.stockEnabled !== false &&
      product.stock !== null &&
      typeof product.stock !== "undefined";
    if (hasManagedStock && Number(product.stock) <= 0) {
      return;
    }

    const hasRequiredSelection = product.variantGroups.some(
      (group) =>
        group.isRequired &&
        group.type === "SINGLE" &&
        !group.options.some((option) => option.defaultValue === true),
    );

    if (hasRequiredSelection) {
      navigate(`/product/${product.id}`);
      return;
    }

    const defaultVariants = getDefaultVariants(product);
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      basePrice: getDisplayPromotionalPrice(product),
      selectedVariants: defaultVariants.map((variant) => ({
        ...variant,
        extraPrice: getDisplayPromotionalPrice(product, variant.extraPrice),
      })),
      quantity: 1,
    });
    recordProductInterest(product.id, "add_to_cart");
    openCheckoutSheet();
  };

  return (
    <div {...props}>
      {category && (
        <SectionTitle title={category} image={categoryImg} hideIcon={true} />
      )}
      <div className="mt-2 grid flex-none grid-cols-2 items-stretch gap-2 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            onClick={() => {
              onProductClick?.(product);
              navigate(`/product/${product.id}`);
            }}
            onAddToCart={() => handleQuickAddToCart(product)}
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}
