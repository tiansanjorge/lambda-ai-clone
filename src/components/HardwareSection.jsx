import { useState } from "react";

const products = [
  {
    title: "NVIDIA VR200 NVL72",
    description: "Rack-scale systems optimized for agentic AI.",
    img: "https://lambda.ai/hubfs/VR200.jpg",
  },
  {
    title: "NVIDIA GB300 NVL72",
    description: "Rack-scale systems optimized for AI reasoning",
    img: "https://lambda.ai/hubfs/gb300.png",
  },
  {
    title: "NVIDIA HGX B300",
    description: "Peak performance per watt for the largest training runs",
    img: "https://lambda.ai/hubfs/NVIDIA%20HGX%20B300%20(1).png",
  },
  {
    title: "NVIDIA HGX B200",
    description: "Versatile fine-tuning and inference",
    img: "https://lambda.ai/hubfs/b200.png",
  },
];

export default function HardwareSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="hardwareSection module-comp">
      <div className="sectionBorder"></div>
      <div className="hardwareInner">
        <div className="hardwareTitleBlock">
          <div className="hardwareTitleLeft">
            <h2 className="hardwareHeading">The hardware behind the frontier.</h2>
          </div>
          <div className="hardwareTitleRight">
            <p className="hardwareSubtitle">
              Access the most advanced NVIDIA hardware available, deployed in our
              purpose-built data centers with zero compromise on performance.
            </p>
          </div>
        </div>

        <div className="hardwareAccordionItems">
          {products.map((product, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={product.title}
                type="button"
                className={`hardwareAccordionItem no-ui-button${isActive ? " hardwareActive" : ""}`}
                onClick={() => {
                  if (!isActive) setActiveIndex(index);
                }}
              >
                <div className={`hardwareAccordionImage${isActive ? " hardwareActiveImage" : ""}`}>
                  <img src={product.img} alt={product.title} />
                </div>
                <div className="hardwareAccordionItemInner">
                  <div className={`hardwareAccordionTextContent${isActive ? " hardwareActiveTextContent" : ""}`}>
                    <h3 className="hardwareAccordionItemTitle">{product.title}</h3>
                    <div className={`hardwareAccordionItemRichText${isActive ? " hardwareActiveRichText" : ""}`}>
                      {product.description}
                    </div>
                  </div>
                </div>
                <span className={`hardwareAccordionItemIndicator${isActive ? " hardwareActiveIndicator" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
