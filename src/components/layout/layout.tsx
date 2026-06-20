import { Outlet, useMatches, useLocation } from "react-router-dom";
import { Suspense } from "react";
import Header from "./header";
import Footer from "./footer";
import { cn } from "@/utils/cn";
import CartFloatButton from "../common/cart-float-button";
import AdvisorChatButton from "../common/advisor-chat-button";
import { useCartStore } from "@/stores/cart.store";

export default function Layout() {
  const matches = useMatches();

  const current = matches[matches.length - 1];
  const hideFooter = (current.handle as any)?.hideFooter;
  const hideCart = (current.handle as any)?.hideCart;
  const hideHeader = (current.handle as any)?.hideHeader;
  const headerPosition = (current.handle as any)?.headerPosition;

  const { items } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={cn("relative flex h-screen w-screen flex-col bg-background")}
    >
      {!(current.handle as any)?.whiteBackground && (
        <div className="absolute left-0 top-0 h-66 w-full bg-peach-fade"></div>
      )}
      {!hideHeader && (
        <Header
          title={(current.handle as any)?.title}
          back={(current.handle as any)?.back}
          position={headerPosition}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
      {!hideFooter && (
        <div className="relative shrink-0">
          <Footer />
          {!hideCart && <CartFloatButton itemCount={totalItems} />}
          <AdvisorChatButton />
        </div>
      )}
    </div>
  );
}
