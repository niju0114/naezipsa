"use client";

import { XIcon, ChevronRightIcon } from "../icons";

// <SubscriptionInfoCard /> : 인사이트 화면 "청약 정보" 카드(기존 시안의
// "예약관리" 자리를 대신함). 1순위/무순위·잔여세대/특별공급 세 그룹으로
// 묶어서 보여준다 - 아이콘 없이 그룹 라벨 색상만으로 구분한다. 데이터는
// 자리표시용이고, 실제 청약 데이터가 정해지면 SUBSCRIPTION_GROUPS를 그
// 데이터로 교체하면 된다.
const SUBSCRIPTION_GROUPS = [
  {
    key: "priority-1",
    label: "1순위",
    labelClass: "is-priority",
    items: [
      {
        id: "sub-1",
        aptName: "행당동 두산위브",
        address: "서울 성동구 행당동",
        deadline: "2024-03-15",
      },
    ],
  },
  {
    key: "no-rank",
    label: "무순위/잔여세대",
    labelClass: "is-no-rank",
    items: [
      {
        id: "sub-2",
        aptName: "행당동 대림아파트",
        address: "서울 성동구 행당동",
        deadline: "2024-03-20",
      },
    ],
  },
  {
    key: "special",
    label: "특별공급",
    labelClass: "is-special",
    items: [
      {
        id: "sub-3",
        aptName: "왕십리 센트라스",
        address: "서울 성동구 하왕십리동",
        deadline: "2024-03-25",
      },
    ],
  },
  {
    key: "priority-2",
    label: "1순위",
    labelClass: "is-priority",
    items: [
      {
        id: "sub-4",
        aptName: "행당동 두산위브",
        address: "서울 성동구 행당동",
        deadline: "2024-03-15",
      },
    ],
  },
  {
    key: "officetel",
    label: "오피스텔",
    labelClass: "is-officetel",
    items: [
      {
        id: "sub-6",
        aptName: "성수 트리마제 오피스텔",
        address: "서울 성동구 성수동1가",
        deadline: "2024-03-28",
      },
    ],
  },
];

export default function SubscriptionInfoCard() {
  return (
    <div className="insight-card" data-component="SubscriptionInfoCard">
      <div className="insight-card-header">
        <span className="insight-card-title">청약 정보</span>
        <a href="#" tabIndex={0} className="insight-card-link">
          더보기
          <ChevronRightIcon />
        </a>
      </div>
      <div className="subscription-list">
        {SUBSCRIPTION_GROUPS.map((group) => (
          <div className="subscription-group" key={group.key}>
            <div className={"subscription-group-label " + group.labelClass}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <a href="#" className="subscription-row" key={item.id}>
                <div className="subscription-row-line">
                  <span className="subscription-row-name">{item.aptName}</span>
                  <button
                    type="button"
                    className="interest-remove-btn"
                    tabIndex={0}
                    aria-label="닫기"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <XIcon />
                  </button>
                </div>
                <div className="subscription-row-line">
                  <span className="subscription-row-address">
                    {item.address}
                  </span>
                  <span className="subscription-row-deadline">
                    {item.deadline}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
