import './AnimatedBg.css';

function AnimatedBg() {
    return (
        <div className="animated-bg">
            <div className="particles">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="particle"></div>
                ))}
            </div>
        </div>
    );
}

export default AnimatedBg;
