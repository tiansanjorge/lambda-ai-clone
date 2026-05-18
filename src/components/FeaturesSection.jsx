import { useState, useEffect } from 'react';
import frame0 from '../assets/datacenter-0.png';
import frame1 from '../assets/datacenter-1.png';
import frame2 from '../assets/datacenter-2.png';
import frame3 from '../assets/datacenter-3.png';

const ACCORDION_ITEMS = [
  {
    id: '01',
    title: 'You bring models. We bring the compute.',
    body: 'Get complete AI factories integrating high-density power, liquid cooling, and NVIDIA GPUs into one system designed for peak AI performance.',
    locked: true,
  },
  {
    id: '02',
    title: 'Your supercomputer. Your rules.',
    body: 'Accelerate every stage of your AI lifecycle. Train foundation models and serve billions of tokens.',
    locked: false,
  },
  {
    id: '03',
    title: 'Orchestration, handled.',
    body: 'Run large-scale AI workloads without the operational burden. We manage your clusters so you can focus on innovation.',
    locked: false,
  },
  {
    id: '04',
    title: 'Experts included.',
    body: "Co-engineer your workloads with the very people building the infrastructure behind the world's most advanced models.",
    locked: false,
  },
];


export default function FeaturesSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 0);
    const t2 = setTimeout(() => {
      setDisplayIndex(openIndex);
      setFading(false);
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [openIndex]);

  function handleToggle(index) {
    if (ACCORDION_ITEMS[index].locked && openIndex === index) return;
    setOpenIndex(index);
  }

  return (
    <section className="pt-xl pb-xl module-comp">
      <div className="container">
        <div className="stack--md">

          {/* Section heading */}
          <div className="titleBlock">
            <div className="grid-x grid-margin-x">
              <div className="cell small-12 medium-7">
                <div>
                  <h2 className="h2">Built for AI. Ready for superintelligence.</h2>
                  <div className="content noContent"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion + illustration grid */}
          <div className="grid-x grid-margin-x">

            {/* Left: numbered accordion */}
            <div className="cell small-12 medium-7">
              <div className="accordion">
                {ACCORDION_ITEMS.map((item, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div className="accordionItem" key={item.id}>
                      <div className="accordionItemNumberColumn">
                        <span className="h5 _accordionActiveItemNumber_1wr90_1" aria-hidden="true">{item.id}</span>
                      </div>
                      <div className="accordionItemContentColumn">
                        <h3 className="accordionItemHeader">
                          <button
                            type="button"
                            className="accordionItemHeaderButton"
                            aria-expanded={isOpen}
                            {...(item.locked ? { 'data-locked': 'true' } : {})}
                            onClick={() => handleToggle(index)}
                          >
                            <span className="accordionItemTitle">{item.title}</span>
                            <span className="accordionToggle" aria-hidden="true">
                              {isOpen ? '−' : '+'}
                            </span>
                          </button>
                        </h3>
                        <div
                          className={`accordionItemContent${isOpen ? ' accordionItemContentOpen' : ''}`}
                          role="region"
                          {...(!isOpen ? { inert: '' } : {})}
                        >
                          <div className="accordionItemRich">
                            <div>{item.body}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: isometric datacenter illustration */}
            <div className="cell small-12 medium-5">
              <div className="_animationContainer_1wr90_9">
                <img
                  src={[frame0, frame1, frame2, frame3][displayIndex]}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    opacity: fading ? 0 : 1,
                    transition: 'opacity 0.5s ease-in-out',
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
      <div className="sectionBorder"></div>
    </section>
  );
}
