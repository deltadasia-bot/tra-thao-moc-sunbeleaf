import { Button, Sheet } from "zmp-ui";
import { CloseIcon } from "./vectors";

interface TermsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsSheet({ visible, onClose }: TermsSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} height="85vh">
      <div className="relative flex h-full w-full flex-col bg-white rounded-t-2xl overflow-hidden">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0">
          <Button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center bg-transparent active:bg-transparent"
            type="neutral"
            size="small"
          >
            <CloseIcon className="text-gray-500 w-5 h-5" />
          </Button>
          <div className="flex-1 text-center text-base font-semibold text-gray-900 pr-8">
            Chính sách & Điều khoản
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-700">
          <div className="terms-content space-y-6 pb-8">
            <h1 className="text-center text-lg font-bold text-[#2e7145] uppercase tracking-wide">
              CHÍNH SÁCH – ĐIỀU KHOẢN CỦA MINI APP SUNBELEAF
            </h1>
            
            <p className="text-center text-xs text-gray-500 italic">
              Cập nhật lần cuối: 18/06/2026
            </p>

            <p>
              Chào mừng Quý khách đến với <strong>Mini App Sunbeleaf</strong>. Chính sách – Điều khoản này quy định các nội dung liên quan đến việc truy cập, sử dụng Mini App Sunbeleaf, tìm hiểu thông tin sản phẩm, đặt hàng, nhận tư vấn, chăm sóc khách hàng và xử lý thông tin người dùng trong quá trình sử dụng Mini App.
            </p>
            
            <p>
              Khi truy cập và sử dụng Mini App Sunbeleaf, Quý khách được xem là đã đọc, hiểu và đồng ý với các nội dung trong Chính sách – Điều khoản này.
            </p>

            {/* Section 1 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                1. Thông tin đơn vị vận hành Mini App
              </h2>
              <p>
                Mini App Sunbeleaf được vận hành bởi:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Tên đơn vị kinh doanh:</strong> Công ty TNHH Thực Phẩm Delta D'Asia</li>
                <li><strong>Thương hiệu:</strong> Sunbeleaf</li>
                <li><strong>Mã số thuế:</strong> 0315888484</li>
                <li><strong>Địa chỉ:</strong> 107 Đường 2, Tổ 3, KP 1, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh, Việt Nam</li>
                <li><strong>Số điện thoại chăm sóc khách hàng:</strong> 0903 349 318</li>
                <li><strong>Email:</strong> <a href="mailto:ecommerce@sunbeleaf.vn" className="text-primary underline">ecommerce@sunbeleaf.vn</a></li>
                <li><strong>Zalo Official Account:</strong> Trà thảo mộc Delta D'Asia</li>
              </ul>
              <p>
                Mini App Sunbeleaf được xây dựng nhằm giới thiệu, tư vấn và hỗ trợ khách hàng tìm hiểu, đặt mua các sản phẩm trà thảo mộc, trà hoa, trà lá và các sản phẩm liên quan đến chăm sóc sức khỏe theo lối sống lành mạnh.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                2. Phạm vi áp dụng
              </h2>
              <p>
                Chính sách – Điều khoản này áp dụng cho tất cả người dùng truy cập, xem thông tin, nhận tư vấn, đặt hàng hoặc sử dụng bất kỳ tính năng nào trên Mini App Sunbeleaf.
              </p>
              <p>
                Các nội dung trong Mini App bao gồm nhưng không giới hạn ở: thông tin sản phẩm, hình ảnh sản phẩm, hướng dẫn sử dụng, giá bán nếu có, chương trình ưu đãi, giỏ hàng, đặt hàng, thanh toán, giao nhận, chăm sóc khách hàng và các nội dung liên quan khác.
              </p>
            </div>

            {/* Section 3 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                3. Sản phẩm và dịch vụ trên Mini App Sunbeleaf
              </h2>
              <p>
                Mini App Sunbeleaf cung cấp thông tin về các sản phẩm trà thảo mộc, trà hoa, trà lá, sản phẩm từ thảo dược sấy khô và các sản phẩm liên quan.
              </p>
              <p>
                Thông tin sản phẩm được thể hiện dựa trên thông tin do Sunbeleaf công bố, bao gồm tên sản phẩm, thành phần, quy cách, hướng dẫn sử dụng, hướng dẫn bảo quản, hình ảnh minh họa và các thông tin cần thiết khác.
              </p>
              <p className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-xs leading-relaxed">
                Các thông tin về công dụng sản phẩm chỉ mang tính chất tham khảo, hỗ trợ khách hàng lựa chọn sản phẩm phù hợp với nhu cầu sử dụng hằng ngày. Sản phẩm không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh. Người dùng có tình trạng sức khỏe đặc biệt, đang điều trị bệnh, đang mang thai, cho con bú hoặc đang sử dụng thuốc nên tham khảo ý kiến chuyên gia y tế trước khi sử dụng.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                4. Điều kiện sử dụng Mini App
              </h2>
              <p>
                Người dùng cần cung cấp thông tin chính xác khi thực hiện đặt hàng, bao gồm họ tên, số điện thoại, địa chỉ nhận hàng và các thông tin cần thiết khác để Sunbeleaf xử lý đơn hàng.
              </p>
              <p>
                Người dùng không được sử dụng Mini App cho các mục đích vi phạm pháp luật, gây ảnh hưởng đến hoạt động của Mini App, giả mạo thông tin, đặt đơn hàng ảo, spam, quấy rối hoặc thực hiện các hành vi làm ảnh hưởng đến quyền lợi của Sunbeleaf và người dùng khác.
              </p>
              <p>
                Sunbeleaf có quyền từ chối xử lý đơn hàng hoặc tạm ngưng hỗ trợ trong trường hợp phát hiện thông tin không chính xác, có dấu hiệu gian lận, lạm dụng khuyến mãi hoặc vi phạm Chính sách – Điều khoản này.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                5. Chính sách đặt hàng
              </h2>
              <p>
                Người dùng có thể đặt hàng thông qua các tính năng được cung cấp trong Mini App Sunbeleaf, bao gồm chọn sản phẩm, chọn số lượng, thêm vào giỏ hàng, điền thông tin giao hàng và xác nhận đơn hàng.
              </p>
              <p>
                Sau khi người dùng gửi thông tin đặt hàng, Sunbeleaf có thể liên hệ lại để xác nhận đơn hàng, tư vấn thêm về sản phẩm, thời gian giao hàng, phí vận chuyển và phương thức thanh toán.
              </p>
              <p>
                Đơn hàng chỉ được xem là hợp lệ khi thông tin khách hàng đầy đủ, sản phẩm còn hàng và Sunbeleaf xác nhận có thể xử lý đơn hàng.
              </p>
              <p>
                Trong trường hợp sản phẩm tạm hết hàng, sai thông tin tồn kho hoặc không thể giao hàng theo khu vực, Sunbeleaf sẽ thông báo cho khách hàng trong thời gian sớm nhất để điều chỉnh, thay đổi sản phẩm, chờ hàng hoặc hủy đơn theo nhu cầu của khách hàng.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                6. Giá bán và thanh toán
              </h2>
              <p>
                Giá sản phẩm hiển thị trên Mini App Sunbeleaf, nếu có, là giá bán tại thời điểm hiển thị và có thể thay đổi tùy theo chương trình khuyến mãi, tồn kho, thời điểm mua hàng hoặc chính sách bán hàng của Sunbeleaf.
              </p>
              <p>
                Sunbeleaf hỗ trợ các phương thức thanh toán được công bố trực tiếp trên Mini App hoặc được nhân viên chăm sóc khách hàng xác nhận, bao gồm thanh toán khi nhận hàng, chuyển khoản ngân hàng hoặc các phương thức thanh toán hợp lệ khác nếu được tích hợp.
              </p>
              <p>
                Nếu Mini App Sunbeleaf có phát sinh đơn hàng, hiển thị giá và hỗ trợ thanh toán trực tiếp trên Mini App, Sunbeleaf sẽ thực hiện theo yêu cầu tích hợp thanh toán phù hợp của nền tảng Zalo Mini App.
              </p>
            </div>

            {/* Section 7 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                7. Chính sách giao hàng
              </h2>
              <p>
                Sunbeleaf hỗ trợ giao hàng đến địa chỉ do khách hàng cung cấp. Thời gian giao hàng phụ thuộc vào khu vực nhận hàng, đơn vị vận chuyển, thời điểm đặt hàng và các điều kiện khách quan khác.
              </p>
              <p>
                Phí giao hàng, thời gian giao dự kiến và đơn vị vận chuyển sẽ được thông báo cho khách hàng trong quá trình đặt hàng hoặc xác nhận đơn hàng.
              </p>
              <p>
                Khách hàng có trách nhiệm cung cấp đầy đủ, chính xác thông tin nhận hàng. Trường hợp đơn hàng giao không thành công do thông tin sai, không liên hệ được người nhận hoặc khách hàng từ chối nhận hàng không có lý do hợp lệ, Sunbeleaf có quyền xử lý theo chính sách bán hàng tại thời điểm phát sinh.
              </p>
            </div>

            {/* Section 8 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                8. Chính sách đổi trả và hoàn tiền
              </h2>
              <p>
                Sunbeleaf hỗ trợ đổi trả sản phẩm trong các trường hợp sau: sản phẩm bị lỗi do nhà sản xuất, hư hỏng trong quá trình vận chuyển, giao sai sản phẩm, thiếu sản phẩm so với đơn hàng đã xác nhận hoặc sản phẩm có dấu hiệu bất thường khi khách hàng nhận hàng.
              </p>
              <p>
                Để được hỗ trợ đổi trả, khách hàng cần liên hệ Sunbeleaf trong vòng 48 giờ kể từ thời điểm nhận hàng, đồng thời cung cấp hình ảnh hoặc video mở hàng, tình trạng sản phẩm, mã đơn hàng và thông tin liên hệ.
              </p>
              <p>
                Sunbeleaf có thể từ chối đổi trả trong các trường hợp sản phẩm đã qua sử dụng, bao bì bị hư hỏng do lỗi bảo quản từ phía khách hàng, khách hàng không cung cấp đủ thông tin xác minh hoặc yêu cầu đổi trả không thuộc phạm vi hỗ trợ.
              </p>
              <p>
                Việc hoàn tiền, nếu có, sẽ được thực hiện sau khi Sunbeleaf xác minh tình trạng đơn hàng và thống nhất phương án xử lý với khách hàng. Thời gian hoàn tiền dự kiến từ 3 đến 7 ngày làm việc tùy theo phương thức thanh toán và đơn vị liên quan.
              </p>
            </div>

            {/* Section 9 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                9. Chính sách bảo mật thông tin người dùng
              </h2>
              <p>
                Sunbeleaf tôn trọng và cam kết bảo vệ thông tin cá nhân của người dùng khi sử dụng Mini App Sunbeleaf.
              </p>
              <p>
                Các thông tin có thể được thu thập bao gồm: họ tên, số điện thoại, địa chỉ giao hàng, nội dung đơn hàng, lịch sử mua hàng, nội dung trao đổi với bộ phận chăm sóc khách hàng và các thông tin khác do người dùng chủ động cung cấp.
              </p>
              <p>
                Trong trường hợp Mini App cần sử dụng thông tin từ tài khoản Zalo như tên hiển thị, ảnh đại diện, số điện thoại, vị trí, quyền gửi thông báo hoặc quyền quan tâm Zalo Official Account, Sunbeleaf chỉ thực hiện xin quyền khi có mục đích rõ ràng và được người dùng đồng ý.
              </p>
              <p>
                Thông tin người dùng được sử dụng cho các mục đích sau: xử lý đơn hàng, giao hàng, xác nhận thanh toán, chăm sóc khách hàng, hỗ trợ đổi trả, gửi thông báo liên quan đến đơn hàng, cải thiện chất lượng dịch vụ và thực hiện các nghĩa vụ theo quy định pháp luật nếu có.
              </p>
              <p>
                Sunbeleaf không bán, trao đổi hoặc chia sẻ thông tin cá nhân của người dùng cho bên thứ ba vì mục đích thương mại khi chưa có sự đồng ý của người dùng, trừ trường hợp cần thiết để xử lý đơn hàng, giao hàng, thanh toán, tuân thủ yêu cầu của cơ quan nhà nước có thẩm quyền hoặc theo quy định pháp luật.
              </p>
              <p>
                Các bên thứ ba có thể tiếp nhận thông tin trong phạm vi cần thiết bao gồm đơn vị vận chuyển, đơn vị thanh toán, đơn vị hỗ trợ kỹ thuật, nền tảng Zalo Mini App hoặc các bên liên quan trực tiếp đến việc cung cấp dịch vụ cho người dùng.
              </p>
            </div>

            {/* Section 10 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                10. Quyền của người dùng đối với dữ liệu cá nhân
              </h2>
              <p>
                Người dùng có quyền yêu cầu Sunbeleaf hỗ trợ kiểm tra, cập nhật, chỉnh sửa hoặc xóa thông tin cá nhân đã cung cấp trong phạm vi Mini App Sunbeleaf quản lý, trừ trường hợp Sunbeleaf cần lưu trữ thông tin theo quy định pháp luật hoặc để xử lý khiếu nại, tranh chấp, giao dịch đang phát sinh.
              </p>
              <p>
                Người dùng có quyền từ chối cung cấp một số thông tin không bắt buộc. Tuy nhiên, việc từ chối cung cấp các thông tin cần thiết như số điện thoại hoặc địa chỉ giao hàng có thể khiến Sunbeleaf không thể xử lý đơn hàng hoặc cung cấp dịch vụ tương ứng.
              </p>
              <p>
                Mọi yêu cầu liên quan đến dữ liệu cá nhân có thể được gửi qua số điện thoại 0903 349 318, email <a href="mailto:ecommerce@sunbeleaf.vn" className="text-primary underline">ecommerce@sunbeleaf.vn</a> hoặc Zalo Official Account Trà thảo mộc Delta D'Asia.
              </p>
            </div>

            {/* Section 11 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                11. Chính sách xin quyền trên Zalo Mini App
              </h2>
              <p>
                Mini App Sunbeleaf chỉ xin quyền người dùng trong ngữ cảnh phù hợp và có giải thích mục đích sử dụng rõ ràng.
              </p>
              <p>
                Mini App có thể xin quyền số điện thoại khi khách hàng cần đặt hàng, xin quyền gửi thông báo khi khách hàng muốn nhận cập nhật về đơn hàng hoặc chương trình chăm sóc khách hàng, xin quyền quan tâm Zalo Official Account khi khách hàng muốn theo dõi thông tin từ Sunbeleaf.
              </p>
              <p>
                Sunbeleaf không bắt buộc người dùng phải cấp quyền ngay khi vừa truy cập Mini App. Nếu người dùng không đồng ý cấp quyền, người dùng vẫn có thể tiếp tục xem các nội dung cơ bản trên Mini App, trừ những tính năng cần thông tin cụ thể để xử lý như đặt hàng, giao hàng hoặc chăm sóc khách hàng.
              </p>
            </div>

            {/* Section 12 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                12. Trách nhiệm của Sunbeleaf
              </h2>
              <p>
                Sunbeleaf có trách nhiệm cung cấp thông tin sản phẩm rõ ràng, trung thực trong phạm vi thông tin do thương hiệu công bố.
              </p>
              <p>
                Sunbeleaf có trách nhiệm tiếp nhận và xử lý yêu cầu hỗ trợ của khách hàng liên quan đến sản phẩm, đơn hàng, thanh toán, giao nhận, đổi trả và các vấn đề phát sinh trong quá trình sử dụng Mini App.
              </p>
              <p>
                Sunbeleaf cam kết duy trì Mini App hoạt động ổn định trong khả năng kiểm soát, đồng thời có thể tạm ngưng, cập nhật hoặc bảo trì Mini App khi cần thiết để cải thiện chất lượng dịch vụ.
              </p>
            </div>

            {/* Section 13 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                13. Trách nhiệm của người dùng
              </h2>
              <p>
                Người dùng có trách nhiệm đọc kỹ thông tin sản phẩm, hướng dẫn sử dụng, hướng dẫn bảo quản và các khuyến nghị trước khi mua và sử dụng sản phẩm.
              </p>
              <p>
                Người dùng có trách nhiệm cung cấp thông tin chính xác khi đặt hàng, nhận hàng đúng hẹn, kiểm tra sản phẩm khi nhận hàng và thông báo kịp thời cho Sunbeleaf nếu phát hiện sai sót.
              </p>
              <p>
                Người dùng không được sao chép, sử dụng hình ảnh, nội dung, logo, nhãn hiệu hoặc tài liệu của Sunbeleaf cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản từ Sunbeleaf.
              </p>
            </div>

            {/* Section 14 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                14. Sở hữu trí tuệ
              </h2>
              <p>
                Toàn bộ logo, hình ảnh, tên thương hiệu, nội dung, thiết kế, bố cục, hình ảnh sản phẩm, bài viết và các tài liệu hiển thị trên Mini App Sunbeleaf thuộc quyền sở hữu hoặc quyền sử dụng hợp pháp của Công ty TNHH Thực Phẩm Delta D'Asia.
              </p>
              <p>
                Mọi hành vi sao chép, chỉnh sửa, phân phối, sử dụng lại hoặc khai thác các nội dung này cho mục đích thương mại mà chưa được Sunbeleaf cho phép đều có thể bị xử lý theo quy định pháp luật.
              </p>
            </div>

            {/* Section 15 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                15. Giới hạn trách nhiệm
              </h2>
              <p>
                Sunbeleaf nỗ lực đảm bảo thông tin trên Mini App chính xác tại thời điểm công bố. Tuy nhiên, thông tin về tồn kho, giá bán, chương trình khuyến mãi, thời gian giao hàng và hình ảnh sản phẩm có thể thay đổi theo thực tế.
              </p>
              <p>
                Sunbeleaf không chịu trách nhiệm đối với các thiệt hại phát sinh do người dùng sử dụng sản phẩm sai hướng dẫn, tự ý kết hợp sản phẩm với thuốc hoặc phương pháp điều trị khác mà không tham khảo ý kiến chuyên gia phù hợp, hoặc cung cấp thông tin không chính xác khi đặt hàng.
              </p>
            </div>

            {/* Section 16 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                16. Tiếp nhận phản ánh và khiếu nại
              </h2>
              <p>
                Sunbeleaf tiếp nhận phản ánh, yêu cầu hỗ trợ và khiếu nại của khách hàng qua các kênh sau:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Số điện thoại:</strong> 0903 349 318</li>
                <li><strong>Email:</strong> <a href="mailto:ecommerce@sunbeleaf.vn" className="text-primary underline">ecommerce@sunbeleaf.vn</a></li>
                <li><strong>Zalo Official Account:</strong> Trà thảo mộc Delta D'Asia</li>
                <li><strong>Đơn vị phụ trách:</strong> Công ty TNHH Thực Phẩm Delta D'Asia</li>
                <li><strong>Địa chỉ:</strong> 107 Đường 2, Tổ 3, KP 1, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh, Việt Nam</li>
              </ul>
              <p>
                Khi gửi khiếu nại, khách hàng vui lòng cung cấp họ tên, số điện thoại, mã đơn hàng, hình ảnh hoặc video liên quan và nội dung cần hỗ trợ để Sunbeleaf có thể kiểm tra và phản hồi nhanh chóng.
              </p>
              <p>
                Sunbeleaf sẽ tiếp nhận, xác minh và phản hồi trong vòng 24 đến 72 giờ làm việc tùy theo mức độ phức tạp của sự việc.
              </p>
            </div>

            {/* Section 17 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                17. Thay đổi Chính sách – Điều khoản
              </h2>
              <p>
                Sunbeleaf có quyền cập nhật, điều chỉnh Chính sách – Điều khoản này để phù hợp với hoạt động kinh doanh, thay đổi tính năng Mini App hoặc yêu cầu của pháp luật và nền tảng Zalo Mini App.
              </p>
              <p>
                Phiên bản cập nhật sẽ được công bố trực tiếp trên Mini App Sunbeleaf. Người dùng tiếp tục sử dụng Mini App sau khi Chính sách – Điều khoản được cập nhật được hiểu là đã đồng ý với các thay đổi đó.
              </p>
            </div>

            {/* Section 18 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                18. Điều khoản chung
              </h2>
              <p>
                Chính sách – Điều khoản này được áp dụng trong phạm vi hoạt động của Mini App Sunbeleaf.
              </p>
              <p>
                Nếu một phần nội dung trong Chính sách – Điều khoản này bị xem là không hợp lệ hoặc không thể thực hiện theo quy định pháp luật, các phần còn lại vẫn tiếp tục có hiệu lực.
              </p>
              <p>
                Mọi vấn đề phát sinh chưa được quy định trong Chính sách – Điều khoản này sẽ được Sunbeleaf xem xét xử lý trên tinh thần thiện chí, bảo vệ quyền lợi hợp pháp của khách hàng và tuân thủ quy định pháp luật hiện hành.
              </p>
            </div>

            {/* Section 19 */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#2e7145]">
                19. Thông tin liên hệ chính thức
              </h2>
              <p>
                Mọi yêu cầu liên quan đến Mini App Sunbeleaf, đơn hàng, sản phẩm, bảo mật thông tin, đổi trả, hoàn tiền hoặc khiếu nại vui lòng liên hệ:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Công ty TNHH Thực Phẩm Delta D'Asia</strong></li>
                <li><strong>Thương hiệu:</strong> Sunbeleaf</li>
                <li><strong>Mã số thuế:</strong> 0315888484</li>
                <li><strong>Địa chỉ:</strong> 107 Đường 2, Tổ 3, KP 1, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh, Việt Nam</li>
                <li><strong>Số điện thoại chăm sóc khách hàng:</strong> 0903 349 318</li>
                <li><strong>Email:</strong> <a href="mailto:ecommerce@sunbeleaf.vn" className="text-primary underline">ecommerce@sunbeleaf.vn</a></li>
                <li><strong>Zalo Official Account:</strong> Trà thảo mộc Delta D'Asia</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
