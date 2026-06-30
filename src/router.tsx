import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./components/layout";
import { getBasePath } from "./utils/zma";
import HomePage from "./pages/home";
import AppErrorState from "./components/common/app-error-state";

const MenuPage = lazy(() => import("./pages/menu"));
const OrderPage = lazy(() => import("./pages/order"));
const ProfilePage = lazy(() => import("./pages/profile"));
const SearchPage = lazy(() => import("./pages/search"));
const ProductDetailPage = lazy(() => import("./pages/product-detail"));
const CheckoutPage = lazy(() => import("./pages/checkout"));
const SelectLocationPage = lazy(() => import("./pages/select-location"));
const OrderSuccessPage = lazy(() => import("./pages/order-success"));
const OrderDetailPage = lazy(() => import("./pages/order-detail"));
const ArticlesPage = lazy(() => import("./pages/articles"));
const NewsPage = lazy(() => import("./pages/news"));
const VouchersPage = lazy(() => import("./pages/profile/vouchers"));
import { copy } from "@/constants/copy";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      errorElement: <AppErrorState />,
      children: [
        { path: "/", element: <HomePage />, handle: { hideHeader: true } },
        { path: "/menu", element: <MenuPage /> },
        {
          path: "/articles",
          element: <ArticlesPage />,
          handle: { hideCart: true },
        },
        {
          path: "/news",
          element: <NewsPage />,
          handle: { hideCart: true },
        },
        {
          path: "/order",
          element: <OrderPage />,
          handle: {
            title: "Lịch sử đơn hàng",
            back: true,
            whiteBackground: true,
            headerPosition: "sticky",
            hideCart: true,
          },
        },
        {
          path: "/profile",
          element: <ProfilePage />,
          handle: {
            hideHeader: true,
            hideCart: true,
            whiteBackground: true,
          },
        },
        {
          path: "/profile/vouchers",
          element: <VouchersPage />,
          handle: {
            title: "Ví voucher của tôi",
            back: true,
            whiteBackground: true,
            hideFooter: true,
            headerPosition: "sticky",
          },
        },
        { path: "/menu/search", element: <SearchPage /> },
        {
          path: "/product/:id",
          element: <ProductDetailPage />,
          handle: {
            whiteBackground: true,
            hideFooter: true,
            hideHeader: true,
          },
        },
        {
          path: "/checkout",
          element: <CheckoutPage />,
          handle: {
            title: copy.header.delivery,
            back: true,
            whiteBackground: true,
            hideFooter: true,
            headerPosition: "sticky",
          },
        },
        {
          path: "/select-location",
          element: <SelectLocationPage />,
          handle: {
            back: true,
            title: copy.header.selectLocation,
            hideFooter: true,
            headerPosition: "sticky",
            whiteBackground: true,
          },
        },
        {
          path: "/order-success",
          element: <OrderSuccessPage />,
          handle: {
            title: copy.header.confirmation,
            whiteBackground: true,
            hideFooter: true,
          },
        },
        {
          path: "/order/:orderId",
          element: <OrderDetailPage />,
          handle: {
            title: " ",
            back: true,
            whiteBackground: true,
            hideFooter: true,
            headerPosition: "sticky",
            hideCart: true,
          },
        },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    basename: getBasePath(),
  },
);

export default router;
